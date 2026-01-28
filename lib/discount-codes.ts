import { supabaseAdmin } from './supabase-admin';

export type DiscountType = 'percent' | 'fixed' | 'full';

export interface DiscountCode {
  id: string;
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  uses_remaining: number;
  active: boolean;
}

export async function validateAndConsumeDiscountCode(code: string): Promise<DiscountCode | null> {
  const { data: existing, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .limit(1)
    .single();

  if (error || !existing) {
    console.warn('Discount code not found or inactive:', error?.message);
    return null;
  }

  if (existing.uses_remaining <= 0) {
    return null;
  }

  const nextUses = existing.uses_remaining - 1;
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('discount_codes')
    .update({ uses_remaining: nextUses })
    .eq('id', existing.id)
    .eq('uses_remaining', existing.uses_remaining)
    .select('*')
    .single();

  if (updateError || !updated) {
    console.warn('Failed to consume discount code:', updateError?.message);
    return null;
  }

  return updated as DiscountCode;
}
