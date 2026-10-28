import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import ConnectionCoverage from '@/components/progression/ConnectionCoverage';
afterEach(cleanup);
it('distinguishes source implementation from live health',()=>{render(<ConnectionCoverage/>);expect(screen.getByText(/not live health/)).toBeInTheDocument();const teams=screen.getByRole('article',{name:'Teams and recordings'});expect(within(teams).getByText('Provider activation required')).toBeInTheDocument();expect(within(teams).getByText(/Source code does not establish account activation/)).toBeInTheDocument();});
it('filters incomplete connectors without changing recorded integration status',()=>{render(<ConnectionCoverage/>);fireEvent.change(screen.getByLabelText('Filter implementation status'),{target:{value:'Merchant connection required'}});expect(screen.getByRole('article',{name:'Pakistan payments'})).toBeInTheDocument();expect(screen.queryByRole('article',{name:'Admissions'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/activate/i})).not.toBeInTheDocument();});
