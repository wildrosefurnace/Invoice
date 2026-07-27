import {
  CheckCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  Cross2Icon,
  DashboardIcon,
  FileTextIcon,
  GearIcon,
  HomeIcon,
  MinusIcon,
  Pencil2Icon,
  PersonIcon,
  PlusCircledIcon,
  PlusIcon,
  ReaderIcon,
  Share2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useEffect, useState, type ReactNode } from "react";

type Screen = "dashboard" | "invoices" | "editor" | "review" | "signature" | "success" | "settings";
type InvoiceStatus = "Draft" | "Unpaid" | "Paid";

type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
};

type LineItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type Invoice = {
  id: string;
  number: string;
  createdAt: string;
  serviceDate: string;
  customer: Customer;
  items: LineItem[];
  taxRate: number;
  notes: string;
  status: InvoiceStatus;
  signature: string;
  signedAt?: string;
};

type BusinessSettings = {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  hours: string;
  taxRate: number;
};

const STORAGE_KEY = "wildrose-invoices-v2";
const SETTINGS_KEY = "wildrose-settings-v1";

const SERVICE_CATALOG: Omit<LineItem, "id" | "quantity">[] = [
  {
    name: "Furnace & Duct Cleaning Package",
    description: "Furnace, supply and return duct cleaning.",
    unitPrice: 119,
  },
  {
    name: "Additional vent",
    description: "Additional supply or return vent.",
    unitPrice: 10,
  },
  {
    name: "Additional furnace",
    description: "Second furnace at the same property.",
    unitPrice: 39,
  },
  {
    name: "HRV cleaning",
    description: "Heat recovery ventilator cleaning.",
    unitPrice: 39,
  },
  {
    name: "Dryer vent cleaning",
    description: "Dryer vent line cleared of lint and buildup.",
    unitPrice: 39,
  },
];

const EMPTY_CUSTOMER: Customer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "Edmonton",
  province: "AB",
  postalCode: "",
};

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Wildrose Furnace & Duct Cleaning",
  email: "",
  phone: "(780) 807-0143 · (587) 566-9095",
  address: "Edmonton & nearby areas, Alberta",
  website: "wildrosefurnace.com",
  hours: "Open 9 AM – 9 PM · 7 days a week",
  taxRate: 5,
};

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

function money(value: number) {
  return currencyFormatter.format(value);
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function createInvoice(sequence: number, taxRate: number): Invoice {
  const today = localDate();
  return {
    id: crypto.randomUUID(),
    number: `WR-${today.replaceAll("-", "")}-${String(sequence).padStart(3, "0")}`,
    createdAt: today,
    serviceDate: today,
    customer: { ...EMPTY_CUSTOMER },
    items: [],
    taxRate,
    notes: "Thank you for choosing Wildrose Furnace & Duct Cleaning.",
    status: "Draft",
    signature: "",
  };
}

function calculate(invoice: Invoice) {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * (invoice.taxRate / 100) * 100) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

function loadInvoices(): Invoice[] {
  try {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("reset")) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as Invoice[] : [];
  } catch {
    return [];
  }
}

function loadSettings(): BusinessSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const saved = JSON.parse(stored) as Partial<BusinessSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      phone: saved.phone?.trim() || DEFAULT_SETTINGS.phone,
      website: saved.website?.trim() || DEFAULT_SETTINGS.website,
      hours: saved.hours?.trim() || DEFAULT_SETTINGS.hours,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function BrandLockup() {
  return (
    <div className="brand-lockup" aria-label="Wildrose Furnace and Duct Cleaning">
      <img src={`${import.meta.env.BASE_URL}brand-mark.svg`} alt="" className="brand-mark" />
      <span className="brand-words">
        <strong>WILDROSE</strong>
        <small>FURNACE &amp; DUCT CLEANING</small>
      </span>
    </div>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return <button className="icon-button" type="button" aria-label={label} onClick={onClick}>{children}</button>;
}

function AppHeader({ title, onBack, action }: { title?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="app-topbar">
      {onBack ? <IconButton label="Go back" onClick={onBack}><ChevronLeftIcon /></IconButton> : <BrandLockup />}
      {title && <strong className="topbar-title">{title}</strong>}
      <div className="topbar-action">{action}</div>
    </header>
  );
}

function BottomNavigation({ active, onChange }: { active: Screen; onChange: (screen: Screen) => void }) {
  const items: Array<{ id: Screen; label: string; icon: ReactNode }> = [
    { id: "dashboard", label: "Home", icon: <DashboardIcon /> },
    { id: "invoices", label: "Invoices", icon: <FileTextIcon /> },
    { id: "settings", label: "Settings", icon: <GearIcon /> },
  ];
  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "is-active" : ""} onClick={() => onChange(item.id)}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function EmptyInvoices({ onNew }: { onNew: () => void }) {
  return (
    <section className="empty-state">
      <span className="empty-icon"><FileTextIcon /></span>
      <h2>No invoices yet</h2>
      <p>Create your first invoice after completing a service visit.</p>
      <button className="primary-button" type="button" onClick={onNew}><PlusIcon /> Create first invoice</button>
    </section>
  );
}

function InvoiceCard({ invoice, onOpen }: { invoice: Invoice; onOpen: () => void }) {
  const values = calculate(invoice);
  const customerName = invoice.customer.name.trim() || "Untitled customer";
  return (
    <button className="invoice-card" type="button" onClick={onOpen}>
      <span className="invoice-card-icon"><FileTextIcon /></span>
      <span className="invoice-card-copy">
        <strong>{customerName}</strong>
        <small>{invoice.number} · {displayDate(invoice.serviceDate)}</small>
      </span>
      <span className="invoice-card-meta">
        <strong>{money(values.total)}</strong>
        <small className={`status-badge status-${invoice.status.toLowerCase()}`}>{invoice.status}</small>
      </span>
      <ChevronRightIcon />
    </button>
  );
}

function Dashboard({ invoices, onNew, onOpen, onNavigate }: { invoices: Invoice[]; onNew: () => void; onOpen: (invoice: Invoice) => void; onNavigate: (screen: Screen) => void }) {
  const paid = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + calculate(invoice).total, 0);
  const outstanding = invoices.filter((invoice) => invoice.status === "Unpaid").reduce((sum, invoice) => sum + calculate(invoice).total, 0);
  return (
    <div className="app-page has-bottom-nav">
      <AppHeader action={<IconButton label="Open settings" onClick={() => onNavigate("settings")}><PersonIcon /></IconButton>} />
      <main className="page-scroll dashboard-page">
        <section className="welcome-block">
          <p className="eyebrow">FIELD INVOICING</p>
          <h1>Invoices made simple on the job.</h1>
          <p>Create accurate invoices, collect approval, and send a PDF before leaving the customer’s home.</p>
          <button className="primary-button hero-button" type="button" onClick={onNew}><PlusIcon /> New invoice</button>
        </section>

        <section className="metric-grid" aria-label="Invoice totals">
          <article><span>Outstanding</span><strong>{money(outstanding)}</strong><small>{invoices.filter((invoice) => invoice.status === "Unpaid").length} unpaid</small></article>
          <article><span>Paid</span><strong>{money(paid)}</strong><small>{invoices.filter((invoice) => invoice.status === "Paid").length} completed</small></article>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div><p className="eyebrow">RECENT</p><h2>Invoices</h2></div>
            {invoices.length > 0 && <button type="button" onClick={() => onNavigate("invoices")}>View all</button>}
          </div>
          {invoices.length === 0 ? <EmptyInvoices onNew={onNew} /> : (
            <div className="invoice-list">{invoices.slice(0, 4).map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onOpen={() => onOpen(invoice)} />)}</div>
          )}
        </section>

        <aside className="trust-note"><CheckCircledIcon /><div><strong>Honest service. Transparent pricing.</strong><span>Only add services the customer approved.</span></div></aside>
      </main>
      <BottomNavigation active="dashboard" onChange={onNavigate} />
    </div>
  );
}

function InvoicesScreen({ invoices, onNew, onOpen, onNavigate }: { invoices: Invoice[]; onNew: () => void; onOpen: (invoice: Invoice) => void; onNavigate: (screen: Screen) => void }) {
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");
  const filtered = filter === "All" ? invoices : invoices.filter((invoice) => invoice.status === filter);
  return (
    <div className="app-page has-bottom-nav">
      <AppHeader action={<IconButton label="New invoice" onClick={onNew}><PlusIcon /></IconButton>} />
      <main className="page-scroll list-page">
        <p className="eyebrow">YOUR RECORDS</p>
        <h1>Invoices</h1>
        <div className="filter-row" aria-label="Filter invoices">
          {(["All", "Draft", "Unpaid", "Paid"] as const).map((status) => <button key={status} type="button" className={filter === status ? "is-active" : ""} onClick={() => setFilter(status)}>{status}</button>)}
        </div>
        {filtered.length === 0 ? <EmptyInvoices onNew={onNew} /> : <div className="invoice-list">{filtered.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onOpen={() => onOpen(invoice)} />)}</div>}
      </main>
      <BottomNavigation active="invoices" onChange={onNavigate} />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <b aria-hidden="true"> *</b>}</span>{children}</label>;
}

function CustomerFields({ customer, onChange }: { customer: Customer; onChange: (next: Customer) => void }) {
  const update = (key: keyof Customer, value: string) => onChange({ ...customer, [key]: value });
  return (
    <div className="form-grid">
      <Field label="Customer name" required><input required value={customer.name} placeholder="Full name or business" onChange={(event) => update("name", event.target.value)} /></Field>
      <div className="two-column">
        <Field label="Phone"><input inputMode="tel" value={customer.phone} placeholder="Phone number" onChange={(event) => update("phone", event.target.value)} /></Field>
        <Field label="Email"><input type="email" value={customer.email} placeholder="Email address" onChange={(event) => update("email", event.target.value)} /></Field>
      </div>
      <Field label="Service address" required><input required value={customer.address} placeholder="Street address" onChange={(event) => update("address", event.target.value)} /></Field>
      <div className="address-row">
        <Field label="City" required><input required value={customer.city} onChange={(event) => update("city", event.target.value)} /></Field>
        <Field label="Province"><input value={customer.province} maxLength={2} onChange={(event) => update("province", event.target.value.toUpperCase())} /></Field>
        <Field label="Postal code"><input value={customer.postalCode} placeholder="A1A 1A1" onChange={(event) => update("postalCode", event.target.value.toUpperCase())} /></Field>
      </div>
    </div>
  );
}

function LineItemRow({ item, onUpdate, onRemove }: { item: LineItem; onUpdate: (next: LineItem) => void; onRemove: () => void }) {
  return (
    <article className="line-item-card">
      <div className="line-item-heading">
        <div><strong>{item.name}</strong><span>{item.description}</span></div>
        <IconButton label={`Remove ${item.name}`} onClick={onRemove}><TrashIcon /></IconButton>
      </div>
      <div className="line-item-controls">
        <div className="quantity-stepper" aria-label={`${item.name} quantity`}>
          <button type="button" aria-label="Decrease quantity" onClick={() => onUpdate({ ...item, quantity: Math.max(1, item.quantity - 1) })}><MinusIcon /></button>
          <output>{item.quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => onUpdate({ ...item, quantity: item.quantity + 1 })}><PlusIcon /></button>
        </div>
        <Field label="Unit price"><span className="money-input"><span>$</span><input inputMode="decimal" aria-label={`${item.name} unit price`} value={item.unitPrice} onChange={(event) => onUpdate({ ...item, unitPrice: Math.max(0, Number(event.target.value) || 0) })} /></span></Field>
        <div className="line-total"><span>Line total</span><strong>{money(item.quantity * item.unitPrice)}</strong></div>
      </div>
    </article>
  );
}

function AddServicePanel({ onAdd, onClose }: { onAdd: (item: LineItem) => void; onClose: () => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const addCatalog = (service: Omit<LineItem, "id" | "quantity">) => onAdd({ ...service, id: crypto.randomUUID(), quantity: 1 });
  const addCustom = () => {
    if (!name.trim() || Number(price) <= 0) return;
    onAdd({ id: crypto.randomUUID(), name: name.trim(), description: description.trim(), quantity: 1, unitPrice: Number(price) });
  };
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="service-panel" role="dialog" aria-modal="true" aria-labelledby="service-panel-title">
        <div className="panel-handle" />
        <div className="panel-heading"><div><p className="eyebrow">SERVICE CATALOG</p><h2 id="service-panel-title">Add a service</h2></div><IconButton label="Close" onClick={onClose}><Cross2Icon /></IconButton></div>
        {!customOpen ? (
          <>
            <div className="catalog-list">
              {SERVICE_CATALOG.map((service) => (
                <button key={service.name} type="button" onClick={() => addCatalog(service)}>
                  <span className="catalog-icon">{service.name.includes("Package") ? <HomeIcon /> : <ReaderIcon />}</span>
                  <span><strong>{service.name}</strong><small>{service.description}</small></span>
                  <span>{money(service.unitPrice)}<PlusCircledIcon /></span>
                </button>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={() => setCustomOpen(true)}><Pencil2Icon /> Add custom service</button>
          </>
        ) : (
          <div className="custom-service-form">
            <Field label="Service name" required><input value={name} placeholder="Service performed" onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Description"><input value={description} placeholder="Optional details" onChange={(event) => setDescription(event.target.value)} /></Field>
            <Field label="Unit price" required><input inputMode="decimal" value={price} placeholder="0.00" onChange={(event) => setPrice(event.target.value)} /></Field>
            <div className="panel-actions"><button className="secondary-button" type="button" onClick={() => setCustomOpen(false)}>Back</button><button className="primary-button" type="button" disabled={!name.trim() || Number(price) <= 0} onClick={addCustom}>Add service</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

function Totals({ invoice, strong = false }: { invoice: Invoice; strong?: boolean }) {
  const values = calculate(invoice);
  return (
    <section className={`totals-card ${strong ? "totals-card-strong" : ""}`} aria-label="Invoice total">
      <div><span>Subtotal</span><strong>{money(values.subtotal)}</strong></div>
      <div><span>GST ({invoice.taxRate}%)</span><strong>{money(values.tax)}</strong></div>
      <div className="grand-total"><span>Total</span><strong>{money(values.total)}</strong></div>
    </section>
  );
}

function InvoiceEditor({ invoice, onChange, onBack, onSaveDraft, onReview }: { invoice: Invoice; onChange: (next: Invoice) => void; onBack: () => void; onSaveDraft: () => void; onReview: () => void }) {
  const [servicePanelOpen, setServicePanelOpen] = useState(false);
  const canReview = Boolean(invoice.customer.name.trim() && invoice.customer.address.trim() && invoice.customer.city.trim() && invoice.items.length > 0);
  const addItem = (item: LineItem) => {
    onChange({ ...invoice, items: [...invoice.items, item] });
    setServicePanelOpen(false);
  };
  const updateItem = (updated: LineItem) => onChange({ ...invoice, items: invoice.items.map((item) => item.id === updated.id ? updated : item) });
  return (
    <div className="app-page editor-page">
      <AppHeader title="New invoice" onBack={onBack} action={<button className="text-button" type="button" onClick={onSaveDraft}>Save draft</button>} />
      <main className="page-scroll editor-scroll">
        <section className="editor-intro">
          <p className="eyebrow">{invoice.number}</p>
          <h1>Build your invoice</h1>
          <div className="progress-steps" aria-label="Invoice progress"><span className="is-active">1</span><i /><span className={invoice.items.length ? "is-active" : ""}>2</span><i /><span>3</span></div>
        </section>

        <section className="form-section">
          <div className="numbered-heading"><span>1</span><div><h2>Customer</h2><p>Who received the service?</p></div></div>
          <CustomerFields customer={invoice.customer} onChange={(customer) => onChange({ ...invoice, customer })} />
        </section>

        <section className="form-section">
          <div className="numbered-heading"><span>2</span><div><h2>Service details</h2><p>Add only approved work.</p></div></div>
          <Field label="Service date"><input type="date" value={invoice.serviceDate} onChange={(event) => onChange({ ...invoice, serviceDate: event.target.value })} /></Field>
          <div className="service-section-heading"><h3>Services</h3><button type="button" onClick={() => setServicePanelOpen(true)}><PlusCircledIcon /> Add service</button></div>
          {invoice.items.length === 0 ? (
            <button className="add-service-empty" type="button" onClick={() => setServicePanelOpen(true)}><PlusIcon /><strong>Add the first service</strong><span>Choose from Wildrose pricing or enter a custom service.</span></button>
          ) : (
            <div className="line-item-list">{invoice.items.map((item) => <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={() => onChange({ ...invoice, items: invoice.items.filter((line) => line.id !== item.id) })} />)}</div>
          )}
          <Totals invoice={invoice} />
        </section>

        <section className="form-section">
          <div className="numbered-heading"><span>3</span><div><h2>Notes</h2><p>Optional message shown on the invoice.</p></div></div>
          <textarea rows={4} value={invoice.notes} onChange={(event) => onChange({ ...invoice, notes: event.target.value })} />
        </section>
      </main>
      <footer className="sticky-action"><button className="primary-button" type="button" disabled={!canReview} onClick={onReview}>Review invoice <ChevronRightIcon /></button>{!canReview && <small>Add a customer, address, and at least one service.</small>}</footer>
      {servicePanelOpen && <AddServicePanel onAdd={addItem} onClose={() => setServicePanelOpen(false)} />}
    </div>
  );
}

function ReviewInvoice({ invoice, settings, onChange, onBack, onEdit, onDelete, onSignature, onSave, onShare }: { invoice: Invoice; settings: BusinessSettings; onChange: (next: Invoice) => void; onBack: () => void; onEdit: () => void; onDelete: () => void; onSignature: () => void; onSave: () => void; onShare: () => void }) {
  return (
    <div className="app-page review-page">
      <AppHeader title="Review invoice" onBack={onBack} action={<IconButton label="Share invoice PDF" onClick={onShare}><Share2Icon /></IconButton>} />
      <main className="page-scroll review-scroll">
        <section className="invoice-paper">
          <div className="paper-brand"><BrandLockup /><div><span>INVOICE</span><strong>{invoice.number}</strong></div></div>
          <div className="paper-contact-line">
            <span>{settings.phone}</span>
            <span>{settings.website}</span>
            <span>{settings.hours}</span>
          </div>
          <div className="invoice-meta-grid">
            <div><span>Issued</span><strong>{displayDate(invoice.createdAt)}</strong></div>
            <div><span>Service date</span><strong>{displayDate(invoice.serviceDate)}</strong></div>
            <label><span>Status</span><select value={invoice.status} onChange={(event) => onChange({ ...invoice, status: event.target.value as InvoiceStatus })}><option>Draft</option><option>Unpaid</option><option>Paid</option></select></label>
          </div>
          <div className="billing-grid">
            <section><span>FROM</span><strong>{settings.businessName}</strong>{settings.address && <p>{settings.address}</p>}{settings.phone && <p>{settings.phone}</p>}{settings.email && <p>{settings.email}</p>}</section>
            <section><span>BILL TO</span><strong>{invoice.customer.name}</strong><p>{invoice.customer.address}<br />{invoice.customer.city}, {invoice.customer.province} {invoice.customer.postalCode}</p>{invoice.customer.email && <p>{invoice.customer.email}</p>}{invoice.customer.phone && <p>{invoice.customer.phone}</p>}</section>
          </div>
          <section className="review-items">
            <div className="review-items-head"><span>Service</span><span>Qty</span><span>Price</span><span>Total</span></div>
            {invoice.items.map((item) => <div className="review-item" key={item.id}><span><strong>{item.name}</strong><small>{item.description}</small></span><span>{item.quantity}</span><span>{money(item.unitPrice)}</span><strong>{money(item.quantity * item.unitPrice)}</strong></div>)}
          </section>
          <Totals invoice={invoice} strong />
          {invoice.notes && <section className="invoice-notes"><span>NOTE</span><p>{invoice.notes}</p></section>}
          <section className="signature-preview"><span>CUSTOMER APPROVAL</span>{invoice.signature ? <><strong>{invoice.signature}</strong><small>Electronically signed {invoice.signedAt ? displayDate(invoice.signedAt) : ""}</small></> : <p>No customer signature yet.</p>}</section>
        </section>
        <section className="review-management" aria-label="Invoice management">
          <button type="button" onClick={onEdit}><Pencil2Icon /> Edit invoice</button>
          <button type="button" className="delete-button" onClick={() => { if (window.confirm(`Delete ${invoice.number}? This cannot be undone.`)) onDelete(); }}><TrashIcon /> Delete</button>
        </section>
      </main>
      <footer className="review-footer">
        <button className="secondary-button" type="button" onClick={onSignature}>{invoice.signature ? <Pencil2Icon /> : <PersonIcon />}{invoice.signature ? "Update signature" : "Get signature"}</button>
        <button className="primary-button" type="button" onClick={onSave}><CheckCircledIcon /> Save invoice</button>
      </footer>
    </div>
  );
}

function SignatureScreen({ invoice, onBack, onComplete }: { invoice: Invoice; onBack: () => void; onComplete: (name: string) => void }) {
  const [name, setName] = useState(invoice.signature);
  const [consent, setConsent] = useState(false);
  return (
    <div className="app-page signature-page">
      <AppHeader title="Customer signature" onBack={onBack} />
      <main className="page-scroll signature-content">
        <span className="signature-icon"><ClipboardCopyIcon /></span>
        <p className="eyebrow">CUSTOMER APPROVAL</p>
        <h1>Approve this invoice</h1>
        <p>By signing, the customer confirms the listed services were completed and the invoice total is correct.</p>
        <Totals invoice={invoice} strong />
        <Field label="Customer’s full name" required><input value={name} placeholder="Type full legal name" onChange={(event) => setName(event.target.value)} /></Field>
        <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I approve this invoice.</strong><small>I confirm the services and total shown above.</small></span></label>
      </main>
      <footer className="sticky-action"><button className="primary-button" type="button" disabled={!name.trim() || !consent} onClick={() => onComplete(name.trim())}>Sign and complete <CheckCircledIcon /></button></footer>
    </div>
  );
}

function SuccessScreen({ invoice, onShare, onDone }: { invoice: Invoice; onShare: () => void; onDone: () => void }) {
  return (
    <div className="app-page success-page">
      <main className="success-content">
        <BrandLockup />
        <span className="success-check"><CheckCircledIcon /></span>
        <p className="eyebrow">INVOICE SAVED</p>
        <h1>Ready to send.</h1>
        <p>{invoice.number} is saved on this device{invoice.signature ? ` and signed by ${invoice.signature}` : ""}.</p>
        <Totals invoice={invoice} strong />
        <button className="primary-button" type="button" onClick={onShare}><Share2Icon /> Share invoice PDF</button>
        <button className="secondary-button" type="button" onClick={onDone}>Back to home</button>
      </main>
    </div>
  );
}

function SettingsScreen({ settings, onChange, onNavigate }: { settings: BusinessSettings; onChange: (settings: BusinessSettings) => void; onNavigate: (screen: Screen) => void }) {
  return (
    <div className="app-page has-bottom-nav">
      <AppHeader />
      <main className="page-scroll settings-page">
        <p className="eyebrow">BUSINESS PROFILE</p>
        <h1>Settings</h1>
        <p className="page-lede">These details appear on every new invoice and stay on this device.</p>
        <section className="settings-card">
          <Field label="Business name"><input value={settings.businessName} onChange={(event) => onChange({ ...settings, businessName: event.target.value })} /></Field>
          <Field label="Business address"><input value={settings.address} placeholder="Business address" onChange={(event) => onChange({ ...settings, address: event.target.value })} /></Field>
          <Field label="Phone"><input inputMode="tel" value={settings.phone} placeholder="Business phone" onChange={(event) => onChange({ ...settings, phone: event.target.value })} /></Field>
          <Field label="Email"><input type="email" value={settings.email} placeholder="Business email" onChange={(event) => onChange({ ...settings, email: event.target.value })} /></Field>
          <Field label="Website"><input inputMode="url" value={settings.website} placeholder="wildrosefurnace.com" onChange={(event) => onChange({ ...settings, website: event.target.value })} /></Field>
          <Field label="Business hours"><input value={settings.hours} placeholder="Open 9 AM – 9 PM · 7 days a week" onChange={(event) => onChange({ ...settings, hours: event.target.value })} /></Field>
          <Field label="Default GST rate"><span className="percent-input"><input inputMode="decimal" value={settings.taxRate} onChange={(event) => onChange({ ...settings, taxRate: Math.max(0, Number(event.target.value) || 0) })} /><span>%</span></span></Field>
        </section>
        <aside className="storage-note"><GearIcon /><div><strong>Device-only storage</strong><span>Invoices are saved in this browser. Cloud backup and multi-device access are not included yet.</span></div></aside>
      </main>
      <BottomNavigation active="settings" onChange={onNavigate} />
    </div>
  );
}

let brandMarkPngPromise: Promise<string> | null = null;

function brandMarkPng() {
  if (brandMarkPngPromise) return brandMarkPngPromise;
  brandMarkPngPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 240;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Invoice logo could not be prepared."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Invoice logo could not be loaded."));
    image.src = `${import.meta.env.BASE_URL}brand-mark-pdf.png`;
  });
  return brandMarkPngPromise;
}

export async function pdfBlob(invoice: Invoice, settings: BusinessSettings, logoOverride?: string) {
  const { jsPDF } = await import("jspdf");
  const values = calculate(invoice);
  const documentPdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
  const pageWidth = documentPdf.internal.pageSize.getWidth();
  const pageHeight = documentPdf.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  const navy: [number, number, number] = [7, 22, 79];
  const green: [number, number, number] = [31, 127, 39];
  const greenSoft: [number, number, number] = [238, 247, 237];
  const text: [number, number, number] = [75, 84, 107];
  const line: [number, number, number] = [221, 226, 234];
  const logo = logoOverride ?? await brandMarkPng();
  let y = 0;

  const setText = (colour: [number, number, number]) => documentPdf.setTextColor(...colour);
  const setFill = (colour: [number, number, number]) => documentPdf.setFillColor(...colour);
  const setDraw = (colour: [number, number, number]) => documentPdf.setDrawColor(...colour);
  const rightText = (value: string, x: number, atY: number) => documentPdf.text(value, x, atY, { align: "right" });

  const addLetterhead = (continuation = false) => {
    setFill(green);
    documentPdf.rect(0, 0, pageWidth, 7, "F");
    documentPdf.addImage(logo, "PNG", margin, 28, 45, 45);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(18);
    setText(navy);
    documentPdf.text("WILDROSE", margin + 55, 48);
    documentPdf.setFontSize(7.4);
    setText(green);
    documentPdf.text("FURNACE & DUCT CLEANING", margin + 55, 62);
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(7.5);
    setText(text);
    documentPdf.text("CLEAN AIR STARTS HERE", margin + 55, 72);

    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(continuation ? 12 : 20);
    setText(navy);
    rightText(continuation ? "INVOICE · CONTINUED" : "INVOICE", pageWidth - margin, 43);
    documentPdf.setFontSize(9);
    setText(green);
    rightText(invoice.number, pageWidth - margin, 59);
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(7.5);
    setText(text);
    rightText("All amounts in Canadian dollars", pageWidth - margin, 72);

    setDraw(navy);
    documentPdf.setLineWidth(1.5);
    documentPdf.line(margin, 87, pageWidth - margin, 87);
    documentPdf.setFontSize(8);
    setText(text);
    const contact = [settings.phone, settings.website, settings.hours].filter(Boolean).join("   •   ");
    documentPdf.text(contact, pageWidth / 2, 101, { align: "center", maxWidth: contentWidth });
    y = 120;
  };

  const drawTableHeader = () => {
    setFill(navy);
    documentPdf.roundedRect(margin, y, contentWidth, 25, 4, 4, "F");
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(8);
    documentPdf.setTextColor(255, 255, 255);
    documentPdf.text("SERVICE", margin + 10, y + 16);
    rightText("QTY", 420, y + 16);
    rightText("PRICE", 493, y + 16);
    rightText("TOTAL", pageWidth - margin - 10, y + 16);
    y += 25;
  };

  const addPageForItems = () => {
    documentPdf.addPage("letter", "portrait");
    addLetterhead(true);
    drawTableHeader();
  };

  addLetterhead();

  const metaY = y;
  const metaWidth = (contentWidth - 18) / 3;
  const meta = [
    ["ISSUED", displayDate(invoice.createdAt)],
    ["SERVICE DATE", displayDate(invoice.serviceDate)],
    ["STATUS", invoice.status.toUpperCase()],
  ];
  meta.forEach(([label, value], index) => {
    const x = margin + index * (metaWidth + 9);
    setFill(index === 2 ? greenSoft : [247, 248, 250]);
    documentPdf.roundedRect(x, metaY, metaWidth, 42, 5, 5, "F");
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(7);
    setText(index === 2 ? green : text);
    documentPdf.text(label, x + 10, metaY + 14);
    documentPdf.setFontSize(9.5);
    setText(navy);
    documentPdf.text(value, x + 10, metaY + 30, { maxWidth: metaWidth - 20 });
  });
  y += 58;

  const billingGap = 20;
  const billingWidth = (contentWidth - billingGap) / 2;
  const customerAddress = [
    invoice.customer.address,
    [invoice.customer.city, invoice.customer.province, invoice.customer.postalCode].filter(Boolean).join(" "),
    invoice.customer.phone,
    invoice.customer.email,
  ].filter(Boolean);
  const businessDetails = [settings.businessName, settings.address, settings.phone, settings.email, settings.website].filter(Boolean);
  const billSections: Array<{ label: string; lines: string[]; x: number }> = [
    { label: "FROM", lines: businessDetails, x: margin },
    { label: "BILL TO", lines: [invoice.customer.name, ...customerAddress], x: margin + billingWidth + billingGap },
  ];
  billSections.forEach((section) => {
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(7.5);
    setText(green);
    documentPdf.text(section.label, section.x, y);
    section.lines.forEach((value, index) => {
      documentPdf.setFont("helvetica", index === 0 ? "bold" : "normal");
      documentPdf.setFontSize(index === 0 ? 10.5 : 8.5);
      setText(index === 0 ? navy : text);
      documentPdf.text(value, section.x, y + 17 + index * 12, { maxWidth: billingWidth - 4 });
    });
  });
  y += Math.max(businessDetails.length, customerAddress.length + 1) * 12 + 34;

  drawTableHeader();
  invoice.items.forEach((item) => {
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(9);
    const nameLines = documentPdf.splitTextToSize(item.name, 292) as string[];
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(7.5);
    const descriptionLines = item.description ? documentPdf.splitTextToSize(item.description, 292) as string[] : [];
    const rowHeight = Math.max(38, nameLines.length * 10 + descriptionLines.length * 9 + 16);
    if (y + rowHeight > pageHeight - 70) addPageForItems();

    setDraw(line);
    documentPdf.setLineWidth(0.7);
    documentPdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(9);
    setText(navy);
    documentPdf.text(nameLines, margin + 10, y + 15);
    if (descriptionLines.length) {
      documentPdf.setFont("helvetica", "normal");
      documentPdf.setFontSize(7.5);
      setText(text);
      documentPdf.text(descriptionLines, margin + 10, y + 15 + nameLines.length * 10 + 2);
    }
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(9);
    setText(navy);
    rightText(String(item.quantity), 420, y + 18);
    rightText(money(item.unitPrice), 493, y + 18);
    documentPdf.setFont("helvetica", "bold");
    rightText(money(item.quantity * item.unitPrice), pageWidth - margin - 10, y + 18);
    y += rowHeight;
  });

  if (y + 188 > pageHeight - 48) {
    documentPdf.addPage("letter", "portrait");
    addLetterhead(true);
  }

  const totalsX = pageWidth - margin - 215;
  const totalsY = y + 18;
  setFill(greenSoft);
  documentPdf.roundedRect(totalsX, totalsY, 215, 91, 7, 7, "F");
  const totals = [
    ["Subtotal", money(values.subtotal)],
    [`GST (${invoice.taxRate}%)`, money(values.tax)],
  ];
  totals.forEach(([label, value], index) => {
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(9);
    setText(text);
    documentPdf.text(label, totalsX + 13, totalsY + 21 + index * 20);
    documentPdf.setFont("helvetica", "bold");
    setText(navy);
    rightText(value, totalsX + 202, totalsY + 21 + index * 20);
  });
  setDraw(green);
  documentPdf.line(totalsX + 12, totalsY + 52, totalsX + 203, totalsY + 52);
  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(11);
  setText(navy);
  documentPdf.text("TOTAL CAD", totalsX + 13, totalsY + 75);
  documentPdf.setFontSize(15);
  setText(green);
  rightText(money(values.total), totalsX + 202, totalsY + 75);
  y = totalsY + 110;

  if (invoice.notes) {
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(7.5);
    setText(green);
    documentPdf.text("NOTE", margin, y);
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(8.5);
    setText(text);
    const noteLines = documentPdf.splitTextToSize(invoice.notes, contentWidth) as string[];
    documentPdf.text(noteLines, margin, y + 15);
    y += noteLines.length * 10 + 26;
  }

  setDraw(line);
  documentPdf.line(margin, y, pageWidth - margin, y);
  y += 18;
  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(7.5);
  setText(green);
  documentPdf.text("CUSTOMER APPROVAL", margin, y);
  documentPdf.setFont(invoice.signature ? "times" : "helvetica", invoice.signature ? "italic" : "normal");
  documentPdf.setFontSize(invoice.signature ? 18 : 8.5);
  setText(invoice.signature ? navy : text);
  documentPdf.text(invoice.signature || "Customer signature pending", margin, y + 22);
  if (invoice.signature) {
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(7.5);
    setText(text);
    documentPdf.text(`Electronically approved ${displayDate(invoice.signedAt || invoice.createdAt)}`, margin, y + 36);
  }

  const pages = documentPdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    documentPdf.setPage(page);
    setFill(navy);
    documentPdf.rect(0, pageHeight - 27, pageWidth, 27, "F");
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(7.5);
    documentPdf.setTextColor(255, 255, 255);
    documentPdf.text(`${settings.website}   •   ${settings.phone}`, margin, pageHeight - 11);
    documentPdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 11, { align: "right" });
  }

  return documentPdf.output("blob");
}

async function shareInvoicePdf(invoice: Invoice, settings: BusinessSettings) {
  const file = new File([await pdfBlob(invoice, settings)], `Wildrose-Invoice-${invoice.number}.pdf`, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `Wildrose Invoice ${invoice.number}`, text: `Invoice for ${invoice.customer.name}`, files: [file] });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function Prototype() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [settings, setSettings] = useState<BusinessSettings>(loadSettings);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [reviewOrigin, setReviewOrigin] = useState<"editor" | "list">("editor");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);

  const nextSequence = invoices.length + 1;
  const navigate = (next: Screen) => setScreen(next);
  const startInvoice = () => {
    setActiveInvoice(createInvoice(nextSequence, settings.taxRate));
    setReviewOrigin("editor");
    setScreen("editor");
  };
  const openInvoice = (invoice: Invoice) => {
    setActiveInvoice({ ...invoice, customer: { ...invoice.customer }, items: invoice.items.map((item) => ({ ...item })) });
    setReviewOrigin("list");
    setScreen("review");
  };
  const saveInvoice = (invoice: Invoice, status?: InvoiceStatus) => {
    const saved = { ...invoice, status: status ?? invoice.status };
    setActiveInvoice(saved);
    setInvoices((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  };

  if (screen === "editor" && activeInvoice) {
    return <InvoiceEditor invoice={activeInvoice} onChange={setActiveInvoice} onBack={() => setScreen("dashboard")} onSaveDraft={() => { saveInvoice(activeInvoice, "Draft"); setScreen("dashboard"); }} onReview={() => { setReviewOrigin("editor"); setScreen("review"); }} />;
  }
  if (screen === "review" && activeInvoice) {
    return <ReviewInvoice invoice={activeInvoice} settings={settings} onChange={setActiveInvoice} onBack={() => setScreen(reviewOrigin === "editor" ? "editor" : "invoices")} onEdit={() => { setReviewOrigin("editor"); setScreen("editor"); }} onDelete={() => { setInvoices((current) => current.filter((invoice) => invoice.id !== activeInvoice.id)); setActiveInvoice(null); setScreen("dashboard"); }} onSignature={() => setScreen("signature")} onSave={() => { const saved = saveInvoice(activeInvoice, activeInvoice.status === "Draft" ? "Unpaid" : activeInvoice.status); setActiveInvoice(saved); setScreen("success"); }} onShare={() => void shareInvoicePdf(activeInvoice, settings)} />;
  }
  if (screen === "signature" && activeInvoice) {
    return <SignatureScreen invoice={activeInvoice} onBack={() => setScreen("review")} onComplete={(name) => { const signed = { ...activeInvoice, signature: name, signedAt: localDate(), status: activeInvoice.status === "Paid" ? "Paid" : "Unpaid" as InvoiceStatus }; saveInvoice(signed); setScreen("success"); }} />;
  }
  if (screen === "success" && activeInvoice) {
    return <SuccessScreen invoice={activeInvoice} onShare={() => void shareInvoicePdf(activeInvoice, settings)} onDone={() => { setActiveInvoice(null); setScreen("dashboard"); }} />;
  }
  if (screen === "invoices") return <InvoicesScreen invoices={invoices} onNew={startInvoice} onOpen={openInvoice} onNavigate={navigate} />;
  if (screen === "settings") return <SettingsScreen settings={settings} onChange={setSettings} onNavigate={navigate} />;
  return <Dashboard invoices={invoices} onNew={startInvoice} onOpen={openInvoice} onNavigate={navigate} />;
}
