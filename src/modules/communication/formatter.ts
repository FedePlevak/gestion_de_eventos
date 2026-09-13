import { WhatsAppTemplateType, WhatsAppMessageData, PreparedWhatsAppMessage } from './types';

/**
 * Genera el texto y enlace web de WhatsApp para una plantilla (Regla S03)
 * Función pura apta para componentes de cliente y servidor.
 */
export function buildWhatsAppMessage(
  templateType: WhatsAppTemplateType,
  data: WhatsAppMessageData
): PreparedWhatsAppMessage {
  let title = '';
  let text = '';

  switch (templateType) {
    case 'INVITATION':
      title = 'Invitación y enlace personal';
      text = `¡Hola, Familia ${data.recipientName}!\n\nTe compartimos el enlace para participar en la organización de *${data.eventName}*:\n${data.accessUrl}\n\nNo necesitás contraseña. Desde allí podés responder las consultas y coordinar los detalles. ¡Esperamos contar con ustedes!`;
      break;

    case 'STAGE_REMINDER':
      title = `Consulta abierta: ${data.stageTitle || 'Consulta'}`;
      text = `Hola, Familia ${data.recipientName}.\n\nEstá abierta la consulta sobre *${data.stageTitle || 'el evento'}* para *${data.eventName}*.${data.deadlineText ? ` Podés responder o cambiar tu elección antes del ${data.deadlineText}:` : ' Podés responder o cambiar tu elección acá:'}\n${data.accessUrl}\n\n¡Gracias por sumarte!`;
      break;

    case 'PAYMENT_REMINDER':
      title = 'Aporte o cuota';
      text = `Hola, Familia ${data.recipientName}.\n\nYa podés informar tu aporte${data.amountText ? ` (${data.amountText})` : ''} para *${data.eventName}* y adjuntar el comprobante desde tu enlace personal:\n${data.accessUrl}\n\nCualquier duda, avisanos desde la misma página. ¡Gracias!`;
      break;

    case 'GENERAL_UPDATE':
      title = 'Novedades del evento';
      text = `Hola, Familia ${data.recipientName}.\n\nHay novedades importantes sobre la organización de *${data.eventName}*. Podés ingresar a tu espacio familiar para ver las últimas actualizaciones:\n${data.accessUrl}\n\n¡Saludos del comité!`;
      break;
  }

  const cleanPhone = data.recipientPhone ? data.recipientPhone.replace(/\D/g, '') : '';
  const waLink = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return {
    templateType,
    title,
    text,
    phone: data.recipientPhone,
    waLink,
  };
}
