// @vitest-environment jsdom
/**
 * BillingPortal render tests — tab semantics, label overrides and the
 * stub client contract, all without any host design system.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingPortal } from '../../../src/presentation/portal/components/BillingPortal';
import { PlanComparison } from '../../../src/presentation/portal/components/PlanComparison';
import { createStubBillingApiClient } from '../../../src/presentation/portal/hooks/useBilling';
import type { BillingSummary, PlanTier } from '../../../src/presentation/portal/types';

const plan = (id: string, name: string, monthly: number): PlanTier => ({
  id,
  name,
  description: `${name} plan`,
  monthlyPrice: monthly,
  yearlyPrice: monthly * 10,
  currency: 'USD',
  features: ['Feature A', { text: 'Feature B', included: false }],
});

const billing: BillingSummary = {
  subscription: {
    id: 'sub_1',
    planId: 'p_pro',
    plan: plan('p_pro', 'Pro', 29),
    status: 'active',
    cycle: 'monthly',
    currentPeriodStart: '2026-01-01',
    currentPeriodEnd: '2026-02-01',
  },
  paymentMethods: [
    {
      id: 'pm_1',
      type: 'card',
      isDefault: true,
      card: { last4: '4242', brand: 'visa', expiryMonth: 12, expiryYear: 2030 },
      createdAt: '2026-01-01',
    },
  ],
  usage: [
    { id: 'u1', name: 'Seats', current: 4, limit: 10, unit: 'seats', resetPeriod: 'monthly' },
  ],
  recentInvoices: [
    {
      id: 'inv_1',
      number: 'INV-001',
      amount: 29,
      currency: 'USD',
      status: 'paid',
      date: '2026-01-01',
      dueDate: '2026-01-15',
    },
  ],
};

describe('BillingPortal', () => {
  it('renders the tablist with all four tabs and overview content by default', () => {
    render(<BillingPortal billing={billing} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /payment methods/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /invoices/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^plan$/i })).toBeInTheDocument();
    // Overview section heading is rendered
    expect(screen.getByText('Current Subscription')).toBeInTheDocument();
  });

  it('switches tabs via the tab buttons', () => {
    const onTabChange = vi.fn();
    render(<BillingPortal billing={billing} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /invoices/i }));
    expect(onTabChange).toHaveBeenCalledWith('invoices');
  });

  it('shows the invoices list on the invoices tab', () => {
    render(<BillingPortal billing={billing} activeTab="invoices" />);
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('shows the empty state when there are no invoices', () => {
    render(
      <BillingPortal
        billing={{ ...billing, recentInvoices: [] }}
        activeTab="invoices"
      />,
    );
    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });

  it('renders the error state instead of content', () => {
    render(<BillingPortal billing={billing} error="Backend down" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Backend down');
  });

  it('applies label overrides across the whole portal', () => {
    render(
      <BillingPortal
        billing={billing}
        labels={{ tabs: { overview: 'Özet' }, overview: { currentSubscription: 'Mevcut Abonelik' } }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Özet' })).toBeInTheDocument();
    expect(screen.getByText('Mevcut Abonelik')).toBeInTheDocument();
    // Non-overridden labels keep their defaults
    expect(screen.getByRole('tab', { name: /invoices/i })).toBeInTheDocument();
  });
});

describe('PlanComparison', () => {
  const plans = [plan('p_starter', 'Starter', 12), plan('p_pro', 'Pro', 29), plan('p_biz', 'Business', 99)];

  it('renders every plan as a radio option with the default English labels', () => {
    render(<PlanComparison plans={plans} cycle="monthly" />);
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Starter/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Pro/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Business/ })).toBeInTheDocument();
  });

  it('shows the yearly save badge computed from real plan prices', () => {
    render(<PlanComparison plans={plans} cycle="monthly" />);
    // 12 → 120 yearly = 0%, 29 → 290 = ~17%, 99 → 990 = ~17% → largest = 17
    expect(screen.getByText('Save 17%')).toBeInTheDocument();
  });

  it('selects a plan through the card', () => {
    const onPlanSelect = vi.fn();
    render(<PlanComparison plans={plans} cycle="monthly" onPlanSelect={onPlanSelect} />);
    fireEvent.click(screen.getByRole('radio', { name: /Business/ }));
    expect(onPlanSelect).toHaveBeenCalledWith('p_biz');
  });
});

describe('createStubBillingApiClient', () => {
  it('rejects every method until configured', async () => {
    const stub = createStubBillingApiClient();
    await expect(stub.loadBilling()).rejects.toThrow('BillingApiClient not configured');
    await expect(stub.updatePlan('p')).rejects.toThrow('BillingApiClient not configured');
  });

  it('honors overrides', async () => {
    const stub = createStubBillingApiClient({ loadBilling: () => Promise.resolve(billing) });
    await expect(stub.loadBilling()).resolves.toBe(billing);
    await expect(stub.cancelSubscription()).rejects.toThrow('BillingApiClient not configured');
  });
});
