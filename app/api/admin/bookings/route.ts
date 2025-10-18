import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { deleteAccessCodesForBooking } from '../../../../lib/seam';

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
        
        // Check if date or time is being modified
        const isDateOrTimeModified = data.selected_date || data.start_time || data.end_time;
        
        // If date/time is being modified, we need to clean up old access codes
        if (isDateOrTimeModified) {
          // Get the current booking to find the old date and customer name
          const { data: currentBooking } = await supabase
            .from('bookings')
            .select('customer_name, selected_date')
            .eq('id', bookingId)
            .single();
          
          if (currentBooking) {
            // Clean up old access codes asynchronously (don't wait for it)
            deleteAccessCodesForBooking(currentBooking.customer_name, currentBooking.selected_date)
              .catch(error => console.error('Error cleaning up old access codes:', error));
          }
        }
        
        updateData = {
          ...data,
          updated_at: new Date().toISOString(),
          // Reset reminder flags if date/time is modified so new access codes are created
          ...(isDateOrTimeModified && {
            reminder_sent: false,
            followup_sent: false
          })
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
