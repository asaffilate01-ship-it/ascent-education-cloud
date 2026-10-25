import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import SocialIcons from '@/components/SocialIcons';
import WhatsAppLink from '@/components/WhatsAppLink';
afterEach(cleanup);
it('shows every brand without placeholder destinations or coming-soon text',()=>{
 render(<SocialIcons/>);
 for(const name of ['Facebook','Instagram','X','LinkedIn','YouTube','Google','WhatsApp'])expect(screen.getByRole('img',{name,exact:true})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'TikTok (opens in a new tab)'})).toHaveAttribute('href','https://www.tiktok.com/@unipathway.pk');
 expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
 expect(screen.getAllByRole('link')).toHaveLength(1);
});
it('shows the themed WhatsApp control before its number is configured',()=>{
 render(<WhatsAppLink/>);expect(screen.getByText('Message on WhatsApp')).toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
