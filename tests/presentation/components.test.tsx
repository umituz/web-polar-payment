// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PolarProvider } from '../../src/presentation/components/PolarProvider';
import { PolarCheckoutButton } from '../../src/presentation/components/PolarCheckoutButton';
import { SubscriptionStatusBadge } from '../../src/presentation/components/SubscriptionStatusBadge';
import { PricingTable } from '../../src/presentation/components/PricingTable';
import { BillingHistoryList } from '../../src/presentation/components/BillingHistoryList';
import { CancelSubscriptionButton } from '../../src/presentation/components/CancelSubscriptionButton';
import { NoopNavigationStrategy } from '../../src/presentation/navigation/navigation.strategy';
import type { PolarAdapter } from '../../src/domain/interfaces';
import { FREE_SUBSCRIPTION_STATUS } from '../../src/domain/entities/subscription.entity';
import type { PolarProduct } from '../../src/domain/entities/product.entity';

function stubAdapter(overrides?: Partial<PolarAdapter>): PolarAdapter {
  return {
    getStatus: vi.fn().mockResolvedValue(FREE_SUBSCRIPTION_STATUS),
    createCheckout: vi.fn().mockResolvedValue({ url: 'https://pay.test/1', id: 'co_1' }),
    syncSubscription: vi.fn().mockResolvedValue({ synced: false }),
    getBillingHistory: vi.fn().mockResolvedValue([]),
    cancelSubscription: vi.fn().mockResolvedValue({ success: false }),
    getPortalUrl: vi.fn().mockResolvedValue('https://portal.test'),
    ...overrides,
  };
}

function mount(ui: ReactNode, adapterImpl: PolarAdapter = stubAdapter()) {
  return render(
    <PolarProvider adapter={adapterImpl} userId="user_1" navigation={new NoopNavigationStrategy()}>
      {ui}
    </PolarProvider>,
  );
}

const product = (id: string, name: string): PolarProduct => ({
  id,
  name,
  description: null,
  isRecurring: true,
  recurringInterval: 'monthly',
  isArchived: false,
  organizationId: 'org_1',
  prices: [
    {
      id: `price_${id}`,
      type: 'fixed',
      amountType: 'fixed',
      amount: 1999,
      currency: 'USD',
      recurringInterval: 'monthly',
      isArchived: false,
      productId: id,
    },
  ],
  benefits: [],
  metadata: {},
  createdAt: '2026-01-01T00:00:00Z',
  modifiedAt: null,
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

describe('PolarCheckoutButton', () => {
  it('renders the label and starts checkout on click', async () => {
    const adapterImpl = stubAdapter();
    mount(<PolarCheckoutButton productId="prod_1" label="Upgrade" />, adapterImpl);

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() => expect(adapterImpl.createCheckout).toHaveBeenCalled());
    const call = (adapterImpl.createCheckout as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.productId).toBe('prod_1');
    expect(call.userId).toBe('user_1');
  });

  it('shows the localized loading label while redirecting', async () => {
    let resolveCheckout: (value: { url: string; id: string }) => void = () => {};
    const adapterImpl = stubAdapter({
      createCheckout: vi.fn().mockImplementation(
        () => new Promise((resolve) => (resolveCheckout = resolve)),
      ),
    });
    mount(
      <PolarCheckoutButton productId="prod_1" label="Yükselt" labels={{ loading: 'Yönlendiriliyor…' }} />,
      adapterImpl,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Yükselt' }));

    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Yönlendiriliyor…'));
    resolveCheckout({ url: 'https://pay.test/1', id: 'co' });
  });

  it('surfaces adapter failures inline', async () => {
    const onError = vi.fn();
    const adapterImpl = stubAdapter({
      createCheckout: vi.fn().mockRejectedValue(new Error('payment provider down')),
    });
    mount(<PolarCheckoutButton productId="prod_1" label="Go" onError={onError} />, adapterImpl);

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('payment provider down'));
    expect(onError).toHaveBeenCalled();
  });
});

describe('SubscriptionStatusBadge', () => {
  it('renders the free label from an override status', () => {
    mount(
      <SubscriptionStatusBadge
        status={{ plan: 'free', subscriptionStatus: 'none' }}
        loading={false}
      />,
    );
    expect(screen.getByText('Free')).toBeDefined();
  });

  it('renders plan and period-end for a cancel-at-period-end subscription', () => {
    mount(
      <SubscriptionStatusBadge
        loading={false}
        status={{
          plan: 'pro',
          subscriptionStatus: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: '2026-12-31T00:00:00Z',
        }}
      />,
    );
    expect(screen.getByText(/Active/)).toBeDefined();
    expect(screen.getByText(/· pro/)).toBeDefined();
    expect(screen.getByText(/ends Dec 31, 2026/)).toBeDefined();
  });

  it('accepts localized status labels', () => {
    mount(
      <SubscriptionStatusBadge
        loading={false}
        status={{ plan: 'pro', subscriptionStatus: 'active' }}
        labels={{ statuses: { active: 'Aktiv' }, endsPrefix: 'endet' }}
      />,
    );
    expect(screen.getByText('Aktiv')).toBeDefined();
  });
});

describe('PricingTable', () => {
  it('renders server-provided products without any fetch (secure path)', () => {
    const adapterImpl = stubAdapter();
    mount(
      <PricingTable products={[product('prod_1', 'Pro Plan')]} ctaLabel="Subscribe" />,
      adapterImpl,
    );

    expect(screen.getByText('Pro Plan')).toBeDefined();
    expect(screen.getByText('$19.99')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDefined();
    // No token supplied → no product fetch path is armed at all.
    expect(screen.queryByText(/Loading pricing/)).toBeNull();
  });

  it('filters by recurring interval', () => {
    const yearly: PolarProduct = { ...product('prod_y', 'Yearly'), recurringInterval: 'yearly' };
    mount(<PricingTable products={[product('prod_m', 'Monthly'), yearly]} />);

    expect(screen.getByText('Monthly')).toBeDefined();
    expect(screen.queryByText('Yearly')).toBeNull();
  });

  it('renders all intervals when filterInterval is null', () => {
    const yearly: PolarProduct = { ...product('prod_y', 'Yearly'), recurringInterval: 'yearly' };
    mount(<PricingTable products={[product('prod_m', 'Monthly'), yearly]} filterInterval={null} />);

    expect(screen.getByText('Monthly')).toBeDefined();
    expect(screen.getByText('Yearly')).toBeDefined();
  });

  it('shows the localized empty state', () => {
    mount(<PricingTable products={[]} labels={{ empty: 'Keine Produkte' }} />);
    expect(screen.getByText('Keine Produkte')).toBeDefined();
  });
});

describe('BillingHistoryList', () => {
  it('renders provided orders with formatted amounts', () => {
    mount(
      <BillingHistoryList
        orders={[
          {
            id: 'o1',
            createdAt: '2026-01-15T10:00:00Z',
            amount: 1999,
            currency: 'USD',
            status: 'paid',
            paid: true,
            productName: 'Pro Plan',
            invoiceUrl: 'https://invoice.test/1',
          },
        ]}
      />,
    );

    expect(screen.getByText('Pro Plan')).toBeDefined();
    expect(screen.getByText('2026-01-15')).toBeDefined();
    expect(screen.getByText('$19.99')).toBeDefined();
    expect(screen.getByText('Paid')).toBeDefined();
  });

  it('shows the localized empty state', () => {
    mount(<BillingHistoryList orders={[]} labels={{ empty: 'Henüz fatura yok' }} />);
    expect(screen.getByText('Henüz fatura yok')).toBeDefined();
  });

  it('exposes a retry control when loading fails', async () => {
    const adapterImpl = stubAdapter({ getBillingHistory: vi.fn().mockRejectedValue(new Error('offline')) });
    mount(<BillingHistoryList />, adapterImpl);

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(retry).toBeDefined();
  });
});

describe('CancelSubscriptionButton', () => {
  it('asks for a reason and forwards it to the adapter', async () => {
    const adapterImpl = stubAdapter({
      cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
    });
    mount(<CancelSubscriptionButton />, adapterImpl);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm cancel' });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'too_expensive' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(adapterImpl.cancelSubscription).toHaveBeenCalledWith('too_expensive'));
  });

  it('confirms without a reason by default', async () => {
    const adapterImpl = stubAdapter({
      cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
    });
    mount(<CancelSubscriptionButton />, adapterImpl);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm cancel' }));

    await waitFor(() => expect(adapterImpl.cancelSubscription).toHaveBeenCalledWith(undefined));
  });

  it('supports fully localized labels', async () => {
    mount(
      <CancelSubscriptionButton
        labels={{ action: 'Abonnement kündigen', confirm: 'Kündigen', keep: 'Behalten' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement kündigen' }));
    expect(await screen.findByRole('button', { name: 'Kündigen' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Behalten' })).toBeDefined();
  });

  it('backing out never calls the adapter', async () => {
    const adapterImpl = stubAdapter();
    mount(<CancelSubscriptionButton />, adapterImpl);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep subscription' }));

    expect(screen.getByRole('button', { name: 'Cancel subscription' })).toBeDefined();
    expect(adapterImpl.cancelSubscription).not.toHaveBeenCalled();
  });
});
