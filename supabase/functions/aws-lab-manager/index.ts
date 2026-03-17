import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

const AWS_REGION = Deno.env.get('AWS_REGION') || 'eu-west-2';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');

// AWS Signature V4 helpers
async function sha256(message: string | Uint8Array): Promise<ArrayBuffer> {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  return await crypto.subtle.digest('SHA-256', data);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

async function signRequest(method: string, service: string, host: string, path: string, body: string, headers: Record<string, string>): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const dateStamp = amzDate.substring(0, 8);

  const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';') + ';host;x-amz-date';
  const canonicalHeaders = Object.entries(headers).map(([k, v]) => `${k.toLowerCase()}:${v}\n`).join('') + `host:${host}\nx-amz-date:${amzDate}\n`;
  const payloadHash = toHex(await sha256(body));
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${toHex(await sha256(canonicalRequest))}`;
  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY!, dateStamp, AWS_REGION, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  return {
    ...headers,
    'Host': host,
    'X-Amz-Date': amzDate,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function awsRequest(service: string, action: string, params: Record<string, any> = {}) {
  const host = `${service}.${AWS_REGION}.amazonaws.com`;
  const body = JSON.stringify(params);
  const headers = {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': action,
  };

  const signed = await signRequest('POST', service, host, '/', body, headers);
  const resp = await fetch(`https://${host}/`, { method: 'POST', headers: signed, body });
  return await resp.json();
}

const VALID_ACTIONS = ['list_vms', 'start_vm', 'stop_vm', 'allocate_vm', 'deallocate_vm', 'get_connection_url', 'create_lab_session'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (!rateLimit(ip, 20, 60_000)) return rateLimitResponse();

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: 'AWS credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, ...params } = await req.json();

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    switch (action) {
      case 'list_vms': {
        const { data } = await supabase.from('lab_vms').select('*').eq('tenant_id', params.tenant_id);
        result = { vms: data };
        break;
      }
      case 'start_vm': {
        const ec2Result = await awsRequest('ec2', 'StartInstances', { InstanceIds: [params.instance_id] });
        await supabase.from('lab_vms').update({ vm_status: 'starting' }).eq('id', params.vm_id);
        result = ec2Result;
        break;
      }
      case 'stop_vm': {
        const ec2Result = await awsRequest('ec2', 'StopInstances', { InstanceIds: [params.instance_id] });
        await supabase.from('lab_vms').update({ vm_status: 'stopping' }).eq('id', params.vm_id);
        result = ec2Result;
        break;
      }
      case 'allocate_vm': {
        const { data: vm } = await supabase.from('lab_vms').insert({
          student_id: params.student_id,
          tenant_id: params.tenant_id,
          vm_name: String(params.vm_name || `Lab-VM-${Date.now()}`).slice(0, 100),
          os_type: params.os_type || 'windows',
          instance_type: params.instance_type || 't3.medium',
          lab_session_id: params.lab_session_id,
          specs: params.specs || { cpu: 2, ram_gb: 4, storage_gb: 50 },
        }).select().single();
        result = { vm };
        break;
      }
      case 'deallocate_vm': {
        await supabase.from('lab_vms').update({ vm_status: 'stopped' }).eq('id', params.vm_id);
        result = { success: true };
        break;
      }
      case 'get_connection_url': {
        const { data: vm } = await supabase.from('lab_vms').select('*').eq('id', params.vm_id).single();
        if (vm?.connection_url) {
          await supabase.from('lab_vms').update({ last_accessed_at: new Date().toISOString() }).eq('id', params.vm_id);
          result = { url: vm.connection_url };
        } else {
          result = { url: null, message: 'VM not yet provisioned on AWS' };
        }
        break;
      }
      case 'create_lab_session': {
        const { data: session } = await supabase.from('lab_sessions').insert({
          title: String(params.title || '').slice(0, 200),
          description: params.description ? String(params.description).slice(0, 1000) : null,
          module_id: params.module_id,
          lecturer_id: auth.userId,
          tenant_id: params.tenant_id,
          scheduled_at: params.scheduled_at,
          is_lab_mode: true,
        }).select().single();
        result = { session };
        break;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AWS Lab Manager error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
