import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookings: bookings || [],
      count: bookings?.length || 0
    });
  } catch (error) {
    console.error('Error in admin bookings API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { bookingId, action, data } = await request.json();

    if (!bookingId || !action) {
      return NextResponse.json(
        { success: false, message: 'Booking ID and action are required' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'cancel':
        updateData = { 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        };
        break;
      
      case 'confirm':
        updateData = { 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        };
        break;
      
      case 'modify':
        if (!data) {
          return NextResponse.json(
            { success: false, message: 'Modification data is required' },
            { status: 400 }
          );
        }
        updateData = {
          ...data,
          updated_at: new Date().toISOString()
        };
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: `Booking ${action} successful`
    });
  } catch (error) {
    console.error('Error in admin bookings PATCH:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
