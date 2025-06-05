// Types for payment methods

export interface PaymentMethod {
  id: number;
  name: string;
  type:
    | "cash"
    | "credit"
    | "debit"
    | "transfer"
    | "check"
    | "deposit"
    | "qr"
    | "payway"
    | "mercadopago"
    | string;
  description: string;
  iconUrl?: string | null;
}

export interface PaymentMethodConfiguration {
  id: number;
  organizationPaymentMethodId: number;
  configKey: string;
  configValue: string;
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationPaymentMethod {
  id: number;
  methodId: number;
  organizationId: string;
  isEnabled: boolean;
  order: number;
  method: PaymentMethod;
  configurations?: PaymentMethodConfiguration[];
}

export interface OrganizationPaymentMethodDisplay {
  id: number;
  order: number;
  isEnabled: boolean;
  card: PaymentMethod;
  configurations?: PaymentMethodConfiguration[];
}

// PayWay specific configuration types
export interface PayWayConfiguration {
  merchant_id: string;
  api_key: string;
  secret_key: string;
  environment: "sandbox" | "production";
  success_url: string;
  cancel_url: string;
  webhook_url: string;
}

export interface PayWayPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  reference: string;
  customer?: {
    email: string;
    name: string;
    document: string;
    phone?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>;
}

// MercadoPago specific configuration types
export interface MercadoPagoConfiguration {
  access_token: string;
  public_key: string;
  environment: "sandbox" | "production";
  success_url: string;
  failure_url: string;
  pending_url: string;
  webhook_url: string;
  notification_url: string;
  integrator_id?: string;
}

export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  currency_id: string;
  description: string;
  payment_method_id?: string;
  token?: string;
  installments?: number;
  issuer_id?: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  additional_info?: {
    items: Array<{
      id: string;
      title: string;
      description?: string;
      picture_url?: string;
      category_id?: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      first_name?: string;
      last_name?: string;
      phone?: {
        area_code?: string;
        number?: string;
      };
      address?: {
        street_name?: string;
        street_number?: number;
        zip_code?: string;
      };
    };
  };
  external_reference?: string;
  notification_url?: string;
}
