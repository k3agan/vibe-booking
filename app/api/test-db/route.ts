import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('bookings')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Database connection failed'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: data
    });
  } catch (error) {
    console.error('Test database error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database test failed'
    }, { status: 500 });
  }
}
