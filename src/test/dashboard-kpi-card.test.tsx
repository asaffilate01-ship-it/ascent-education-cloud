import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {CreditCard} from 'lucide-react';
import StatCard from '../components/ui/StatCard';

describe('dashboard KPI cards',()=>{
  it('preserves fractional values when the metric updates',()=>{
    const {rerender}=render(<StatCard label="Recorded balance" value={120.25} icon={CreditCard}/>);
    expect(screen.getByText((120.25).toLocaleString(undefined,{maximumFractionDigits:20}))).toBeTruthy();
    rerender(<StatCard label="Recorded balance" value={120.75} icon={CreditCard}/>);
    expect(screen.getByText((120.75).toLocaleString(undefined,{maximumFractionDigits:20}))).toBeTruthy();
  });
  it('does not present invalid numeric values as verified metrics',()=>{
    render(<StatCard label="Recorded balance" value={NaN} icon={CreditCard}/>);
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });
});
