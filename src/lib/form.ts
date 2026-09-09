/** Shared shape for useActionState-backed forms. Initial state is `{}`. */
export type FormState = {
  error?: string;
  ok?: boolean;
  message?: string;
};

export const okState: FormState = { ok: true };
export const errState = (error: string): FormState => ({ error });
