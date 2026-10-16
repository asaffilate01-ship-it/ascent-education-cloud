import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import ConnectionCoverage from '@/components/progression/ConnectionCoverage';
afterEach(cleanup);
it('distinguishes source implementation from live health',()=>{render(<ConnectionCoverage/>);expect(screen.getByText(/not live health/)).toBeInTheDocument();expect(screen.getByText('Microsoft Education · Connector incomplete')).toBeInTheDocument();expect(screen.getByText('Intelligence calculation · Repair required')).toBeInTheDocument();});
it('filters incomplete connectors without changing recorded integration status',()=>{render(<ConnectionCoverage/>);fireEvent.change(screen.getByLabelText('Filter implementation status'),{target:{value:'Connector incomplete'}});expect(screen.getByText('Institutional payments · Connector incomplete')).toBeInTheDocument();expect(screen.queryByText('Admissions and partner referrals · Workflow wired')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/activate/i})).not.toBeInTheDocument();});
