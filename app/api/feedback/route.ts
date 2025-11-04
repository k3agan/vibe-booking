import { NextRequest, NextResponse } from 'next/server';
import { sendFeedbackEmail, sendFeedbackThankYouEmail } from '../../lib/email';

// POST endpoint to submit feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      bookingRef,
      cleanliness,
      valueForMoney,
      easeOfBooking,
      amenitiesAvailable,
      buildingAccessCode,
      responsivenessOfStaff,
      overallSatisfaction,
      cleanlinessImprovement,
      valueForMoneyImprovement,
      easeOfBookingImprovement,
      amenitiesAvailableImprovement,
      buildingAccessCodeImprovement,
      responsivenessOfStaffImprovement,
      overallSatisfactionImprovement,
      generalFeedback,
    } = body;

    // Validate ratings are provided
    if (
      cleanliness === undefined ||
      valueForMoney === undefined ||
      easeOfBooking === undefined ||
      amenitiesAvailable === undefined ||
      buildingAccessCode === undefined ||
      responsivenessOfStaff === undefined ||
      overallSatisfaction === undefined
    ) {
      return NextResponse.json(
        { error: 'All ratings are required' },
        { status: 400 }
      );
    }

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value: string | undefined | null) => {
      if (value === undefined || value === null) return null;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      return trimmed === '' ? null : trimmed;
    };

    // Compile feedback data
    const feedbackData = {
      name: toNullIfEmpty(name),
      email: toNullIfEmpty(email),
      bookingRef: toNullIfEmpty(bookingRef),
      ratings: {
        cleanliness,
        valueForMoney,
        easeOfBooking,
        amenitiesAvailable,
        buildingAccessCode,
        responsivenessOfStaff,
        overallSatisfaction,
      },
      improvements: {
        cleanliness: toNullIfEmpty(cleanlinessImprovement),
        valueForMoney: toNullIfEmpty(valueForMoneyImprovement),
        easeOfBooking: toNullIfEmpty(easeOfBookingImprovement),
        amenitiesAvailable: toNullIfEmpty(amenitiesAvailableImprovement),
        buildingAccessCode: toNullIfEmpty(buildingAccessCodeImprovement),
        responsivenessOfStaff: toNullIfEmpty(responsivenessOfStaffImprovement),
        overallSatisfaction: toNullIfEmpty(overallSatisfactionImprovement),
      },
      generalFeedback: toNullIfEmpty(generalFeedback),
    };

    // Send feedback email
    let emailResult;
    try {
      emailResult = await sendFeedbackEmail(feedbackData);
    } catch (emailError) {
      console.error('Error calling sendFeedbackEmail:', emailError);
      return NextResponse.json(
        { error: `Failed to send feedback email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!emailResult.success) {
      console.error('Failed to send feedback email:', emailResult.error);
      return NextResponse.json(
        { error: `Failed to submit feedback: ${emailResult.error || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Send thank you email if customer provided email
    if (feedbackData.email) {
      try {
        // Calculate average rating
        const ratings = feedbackData.ratings;
        const averageRating = (
          ratings.cleanliness +
          ratings.valueForMoney +
          ratings.easeOfBooking +
          ratings.amenitiesAvailable +
          ratings.buildingAccessCode +
          ratings.responsivenessOfStaff +
          ratings.overallSatisfaction
        ) / 7;

        await sendFeedbackThankYouEmail({
          customerEmail: feedbackData.email,
          customerName: feedbackData.name,
          averageRating,
        });
      } catch (thankYouError) {
        // Don't fail the request if thank you email fails
        console.error('Failed to send thank you email:', thankYouError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
