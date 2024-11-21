import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { DEFAULT_CREDITS } from '../../lib/constants';

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      return Response.json({ 
        error: "Invalid API key",
        success: false 
      }, { 
        status: 401 
      });
    }

    const { userId } = getAuth(req);
    
    if (!userId) {
      return Response.json({ 
        error: "Unauthorized",
        success: false 
      }, { 
        status: 401 
      });
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await response.json();
    
    const credits = typeof userData.public_metadata?.remaining === 'number' 
      ? userData.public_metadata.remaining 
      : DEFAULT_CREDITS;
    
    const isUnlimited = userData.public_metadata?.unlimited === true;

    return Response.json({ 
      success: true,
      credits,
      isUnlimited
    });

  } catch (error) {
    console.error('Error fetching user credits:', error);
    return Response.json({ 
      error: "Failed to fetch user credits",
      success: false 
    }, { 
      status: 500 
    });
  }
} 