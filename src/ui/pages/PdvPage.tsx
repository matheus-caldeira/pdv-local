import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { ProductGrid } from '../organisms/ProductGrid';
import { Cart } from '../organisms/Cart';
import { CustomizationModal } from '../organisms/CustomizationModal';
import { PaymentPanel } from '../organisms/PaymentPanel';
import { useSession } from '../hooks/useSession';
import { useProducts } from '../hooks/useProducts';
import { usePdvController, type PayOption } from '../hooks/usePdvController';
import {
  useCustomizationLoader,
  type LoadedCustomizationGroup,
} from '../hooks/useCustomizationLoader';
import type { Product } from '../../domain/product/product.entity';

interface CustomizationState {
  product: Product;
  groups: LoadedCustomizationGroup[];
}

function PdvSession({ sessionId }: { sessionId: number }) {
  const products = useProducts();
  const loadCustomizations = useCustomizationLoader();
  const controller = usePdvController(sessionId);

  const [customization, setCustomization] = useState<CustomizationState | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);

  async function handleProductClick(product: Product) {
    if (product.customizationGroupIds.length === 0) {
      controller.addSimpleToCart(product);
      return;
    }
    const groups = await loadCustomizations(product);
    if (groups.length === 0) {
      controller.addSimpleToCart(product);
      return;
    }
    setCustomization({ product, groups });
  }

  async function handleFinalize(
    option: PayOption,
    paymentMethod: string | null,
  ) {
    const ok = await controller.finalizeSale(option, paymentMethod);
    if (ok) setPaymentOpen(false);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col gap-4 md:flex-row">
      <ProductGrid
        products={products}
        cart={controller.cart}
        onSelect={handleProductClick}
      />

      <Cart
        cart={controller.cart}
        total={controller.total}
        customerName={controller.customerName}
        onCustomerNameChange={controller.setCustomerName}
        phone={controller.phone}
        onPhoneChange={controller.onPhoneChange}
        address={controller.address}
        onAddressChange={controller.setAddress}
        ticket={controller.ticket}
        onTicketChange={controller.setTicket}
        matchedCustomer={controller.matchedCustomer}
        customerSuggestions={controller.customerSuggestions}
        onSelectCustomer={controller.selectCustomer}
        onUpdateQty={controller.updateQty}
        onRemoveItem={controller.removeCartItem}
        onSetObservation={controller.setObservation}
        onFinalize={() => setPaymentOpen(true)}
      />

      {customization && (
        <CustomizationModal
          product={customization.product}
          groups={customization.groups}
          onClose={() => setCustomization(null)}
          onConfirm={(item) => {
            controller.addCustomizedToCart(item);
            setCustomization(null);
          }}
        />
      )}

      <PaymentPanel
        open={paymentOpen}
        total={controller.total}
        onClose={() => setPaymentOpen(false)}
        onFinalize={handleFinalize}
      />
    </div>
  );
}

export function PdvPage() {
  const { activeSession, loading } = useSession();
  const navigate = useNavigate();

  if (loading) return null;

  if (!activeSession?.id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl text-ink-secondary">Abra o caixa para vender</h2>
        <Button onClick={() => navigate('/cash')}>Abrir Caixa</Button>
      </div>
    );
  }

  return <PdvSession sessionId={activeSession.id} />;
}
