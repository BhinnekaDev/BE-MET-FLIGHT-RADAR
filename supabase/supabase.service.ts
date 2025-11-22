import { supabase } from './supabase.client';
import { User } from '@supabase/supabase-js';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SupabaseService {
  async getUser(token: string): Promise<User> {
    const response = await supabase.auth.getUser(token);

    if (response.error || !response.data?.user) {
      throw new UnauthorizedException('Token tidak valid');
    }

    return response.data.user;
  }
}
