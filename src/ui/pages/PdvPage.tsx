import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { ProductGrid } from '../organisms/ProductGrid';
import { Cart } from '../organisms/Cart';
import { CustomizationModal } from '../organisms/CustomizationModal';
import { TabOpenedModal } from '../organisms/TabOpenedModal';
import { OpenTabPromptModal } from '../organisms/OpenTabPromptModal';
import { PaymentPanel } from '../organisms/PaymentPanel';
import { QuickCustomerModal } from '../organisms/QuickCustomerModal';
import { TabSelector } from '../organisms/TabSelector';
import { CartBar } from '../organisms/CartBar';
import { Modal } from '../molecules/Modal';
import { CartItemList } from '../molecules/CartItemList';
import { CustomerPicker } from '../molecules/CustomerPicker';
import { useSession } from '../hooks/useSession';
import { useProducts } from '../hooks/useProducts';
import { usePdvController, type PayOption } from '../hooks/usePdvController';
import { useTabs } from '../hooks/useTabs';
import { usePrint } from '../hooks/usePrint';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  useCustomizationLoader,
  type LoadedCustomizationGroup,
} from '../hooks/useCustomizationLoader';
import { findOpenTabForCustomer } from '../../domain/order/order.rules';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';

interface CustomizationState {
  product: Product;
  groups: LoadedCustomizationGroup[];
}

function PdvSession({ sessionUid }: { sessionUid: string }) {
  const products = useProducts();
  const loadCustomizations = useCustomizationLoader();
  const controller = usePdvController(sessionUid);
  const {
    openTabs,
    addItems,
    openTab,
    refresh: refreshTabs,
  } = useTabs(sessionUid);
  const { printTabNumber } = usePrint();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customization, setCustomization] = useState<CustomizationState | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedTabUid, setSelectedTabUid] = useState<string | null>(() =>
    searchParams.get('tab'),
  );
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [promptTab, setPromptTab] = useState<Order | null>(null);
  const [openedTab, setOpenedTab] = useState<Order | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  const selectedTab =
    openTabs.find((tab) => tab.uid === selectedTabUid) ?? null;

  function handleSelectCustomer(customer: Customer) {
    controller.selectCustomer(customer);
    setPromptTab(findOpenTabForCustomer(openTabs, customer.uid));
  }

  function handleCustomerCreated(customer: Customer) {
    handleSelectCustomer(customer);
    setQuickCustomerOpen(false);
  }

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

  async function handleLaunchToTab(orderUid: string) {
    const ok = await addItems(orderUid, controller.cart);
    if (ok) {
      controller.clearCart();
      navigate('/orders');
    }
  }

  function finishTabOpening() {
    setOpenedTab(null);
    setSelectedTabUid(null);
    controller.resetForm();
    navigate('/orders');
  }

  async function handleOpenNewTab() {
    const opened = await openTab(controller.customerName.trim(), {
      customerUid: controller.matchedCustomer?.uid,
    });
    if (!opened) return;
    setSelectedTabUid(opened.uid);
    setOpenedTab(opened);
    void refreshTabs();
  }

  function handleTabAction() {
    if (selectedTab) {
      void handleLaunchToTab(selectedTab.uid);
      return;
    }
    void handleOpenNewTab();
  }

  return (
    <div
      className={
        isMobile
          ? 'flex flex-col gap-4 pb-[calc(var(--nav-bottom-height)+7rem)]'
          : 'flex min-h-[calc(100dvh-3rem)] flex-col gap-4 md:flex-row'
      }
    >
      <ProductGrid
        products={products}
        cart={controller.cart}
        onSelect={handleProductClick}
        linear={isMobile}
      />

      {isMobile ? (
        <>
          <CartBar
            cart={controller.cart}
            total={controller.total}
            customerName={controller.customerName}
            ordering={controller.ordering}
            selectedTab={selectedTab}
            onExpand={() => setCartSheetOpen(true)}
            onOpenCustomer={() => setCustomerSheetOpen(true)}
            onOpenTab={handleTabAction}
            onFinalize={() => setPaymentOpen(true)}
            onCreateCustomer={() => setQuickCustomerOpen(true)}
            onClearCart={controller.clearCart}
          />

          <Modal
            open={cartSheetOpen}
            onClose={() => setCartSheetOpen(false)}
            title="Itens do pedido"
          >
            <CartItemList
              cart={controller.cart}
              onUpdateQty={controller.updateQty}
              onRemoveItem={controller.removeCartItem}
              onSetObservation={controller.setObservation}
            />
          </Modal>

          <Modal
            open={customerSheetOpen}
            onClose={() => setCustomerSheetOpen(false)}
            title="Cliente"
          >
            <CustomerPicker
              customerName={controller.customerName}
              onCustomerNameChange={controller.onCustomerNameChange}
              customerSuggestions={controller.customerSuggestions}
              onSelectCustomer={(customer) => {
                handleSelectCustomer(customer);
                setCustomerSheetOpen(false);
              }}
              onCreateCustomer={() => {
                setCustomerSheetOpen(false);
                setQuickCustomerOpen(true);
              }}
              tabs={openTabs}
              selectedTabUid={selectedTabUid}
              onSelectTab={setSelectedTabUid}
            />
          </Modal>
        </>
      ) : (
        <div className="flex w-full flex-col gap-3 md:w-auto">
          <TabSelector
            tabs={openTabs}
            selectedUid={selectedTabUid}
            onSelect={setSelectedTabUid}
          />

          <Cart
            cart={controller.cart}
            total={controller.total}
            customerName={controller.customerName}
            onCustomerNameChange={controller.onCustomerNameChange}
            customerSuggestions={controller.customerSuggestions}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomer={() => setQuickCustomerOpen(true)}
            address={controller.address}
            onAddressChange={controller.setAddress}
            showAddress={false}
            matchedCustomer={controller.matchedCustomer}
            ordering={controller.ordering}
            onUpdateQty={controller.updateQty}
            onRemoveItem={controller.removeCartItem}
            onSetObservation={controller.setObservation}
            onFinalize={() => setPaymentOpen(true)}
            selectedTab={selectedTab}
            onLaunchToTab={
              selectedTab ? () => handleLaunchToTab(selectedTab.uid) : undefined
            }
            onOpenNewTab={handleOpenNewTab}
          />
        </div>
      )}

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

      <TabOpenedModal
        tab={openedTab}
        onContinue={finishTabOpening}
        onPrint={() => {
          void printTabNumber(openedTab!);
          finishTabOpening();
        }}
      />

      <OpenTabPromptModal
        tab={promptTab}
        customerName={controller.customerName}
        onUseTab={() => {
          setSelectedTabUid(promptTab!.uid);
          setPromptTab(null);
        }}
        onDismiss={() => setPromptTab(null)}
      />

      <QuickCustomerModal
        open={quickCustomerOpen}
        initialName={controller.customerName}
        onClose={() => setQuickCustomerOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}

export function PdvPage() {
  const { activeSession, loading } = useSession();
  const navigate = useNavigate();

  if (loading) return null;

  if (!activeSession?.uid) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl text-ink-secondary">Abra o caixa para vender</h2>
        <Button onClick={() => navigate('/cash')}>Abrir Caixa</Button>
      </div>
    );
  }

  return <PdvSession sessionUid={activeSession.uid} />;
}
