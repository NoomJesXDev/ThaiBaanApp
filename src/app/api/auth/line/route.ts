import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    const clientId = process.env.LINE_CHANNEL_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'LINE Channel ID is not configured on the server' },
        { status: 500 }
      );
    }

    // Verify with LINE API
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: clientId,
      }),
    });

    const verified = await res.json();
    if (verified.error) {
      return NextResponse.json(
        { error: 'Unauthorized: ' + (verified.error_description || 'Invalid token') },
        { status: 401 }
      );
    }

    // verified.sub = LINE userId (verified & trusted)
    // verified.name = display name
    // verified.picture = profile image URL
    return NextResponse.json({ profile: verified });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
