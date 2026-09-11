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
      title = 'Invitación y Acceso al Evento';
      text = `¡Hola, Familia ${data.recipientName}! 👋\n\nTe compartimos el enlace privado para coordinar y participar en la *${data.eventName}*:\n🔗 ${data.accessUrl}\n\nNo necesitás contraseña. Desde allí podrás responder las consultas y coordinar los detalles. ¡Esperamos contar con ustedes!`;
      break;

    case 'STAGE_REMINDER':
      title = `Recordatorio: ${data.stageTitle || 'Consulta pendiente'}`;
      text = `Hola, Familia ${data.recipientName} 👋\n\nTe recordamos que está abierta la consulta *"${data.stageTitle || 'Consulta'}"* para la *${data.eventName}*.\n${data.deadlineText ? `⏰ Cierre: ${data.deadlineText}\n` : ''}\nPodés responder o cambiar tu elección directamente acá:\n🔗 ${data.accessUrl}\n\n¡Muchas gracias por participar!`;
      break;

    case 'PAYMENT_REMINDER':
      title = 'Recordatorio de Cuota o Aporte';
      text = `Hola, Familia ${data.recipientName} 👋\n\nTe recordamos que podés informar tu aporte${data.amountText ? ` (${data.amountText})` : ''} para la *${data.eventName}* y adjuntar el comprobante de transferencia desde tu enlace seguro:\n🔗 ${data.accessUrl}\n\nCualquier consulta quedamos a las órdenes. ¡Muchas gracias!`;
      break;

    case 'GENERAL_UPDATE':
      title = 'Novedad del Evento';
      text = `Hola, Familia ${data.recipientName} 👋\n\nHay novedades importantes sobre la organización de la *${data.eventName}*. Podés ingresar a tu espacio familiar para ver las últimas actualizaciones:\n🔗 ${data.accessUrl}\n\n¡Saludos del comité!`;
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
