export type WhatsAppTemplateType =
  | 'INVITATION'
  | 'STAGE_REMINDER'
  | 'PAYMENT_REMINDER'
  | 'GENERAL_UPDATE';

export interface WhatsAppMessageData {
  recipientName: string;
  recipientPhone?: string;
  eventName: string;
  accessUrl: string;
  stageTitle?: string;
  deadlineText?: string;
  amountText?: string;
  bankName?: string;
}

export interface PreparedWhatsAppMessage {
  templateType: WhatsAppTemplateType;
  title: string;
  text: string;
  phone?: string;
  waLink: string;
}
