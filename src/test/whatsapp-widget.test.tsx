import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
const config=vi.hoisted(()=>({whatsapp:''}));
vi.mock('@/lib/publicContact',()=>({SOCIAL_LINKS:config}));
import WhatsAppWidget from '@/components/WhatsAppWidget';
import WhatsAppLink from '@/components/WhatsAppLink';
afterEach(()=>{cleanup();config.whatsapp='';});
it('opens from page buttons, offers contact fallback and closes with Escape',()=>{
 render(<MemoryRouter><WhatsAppLink/><WhatsAppWidget/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Message on WhatsApp'}));
 expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Contact admissions'})).toHaveAttribute('href','/contact');
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();
});
it('opens WhatsApp with an encoded draft when configured',()=>{
 config.whatsapp='https://wa.me/441234567890?text=original';render(<MemoryRouter><WhatsAppWidget/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Open WhatsApp chat'}));fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'Fees & admission?'}});
 const url=new URL(screen.getByRole('link',{name:'Continue in WhatsApp'}).getAttribute('href')!);expect(url.pathname).toBe('/441234567890');expect(url.searchParams.get('text')).toBe('Fees & admission?');
});
