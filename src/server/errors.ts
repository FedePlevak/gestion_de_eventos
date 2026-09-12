export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly userMessage: string;

  constructor(message: string, code: string, statusCode: number, userMessage?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Acceso no autorizado', userMessage = 'Necesitás un enlace válido para ingresar.') {
    super(message, 'UNAUTHORIZED', 401, userMessage);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado', userMessage = 'No tenés permisos para realizar esta acción o ver este contenido.') {
    super(message, 'FORBIDDEN', 403, userMessage);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', userMessage = 'El contenido que buscás no existe o ya no está disponible.') {
    super(message, 'NOT_FOUND', 404, userMessage);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto de concurrencia', userMessage = 'Alguien más actualizó esta información recientemente. Recargá la página para ver los cambios.') {
    super(message, 'CONFLICT', 409, userMessage);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', userMessage?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      userMessage || (message !== 'Datos inválidos' ? message : 'Por favor revisá los datos ingresados e intentá nuevamente.')
    );
  }
}

export class StageClosedError extends AppError {
  constructor(message = 'Etapa cerrada', userMessage = 'Esta etapa ya cerró o venció el plazo para responder.') {
    super(message, 'STAGE_CLOSED', 400, userMessage);
  }
}

export class PaymentLockedError extends AppError {
  constructor(message = 'Pago bloqueado', userMessage = 'El pago ya fue verificado o no admite más modificaciones.') {
    super(message, 'PAYMENT_LOCKED', 400, userMessage);
  }
}
