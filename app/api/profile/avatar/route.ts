import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { getIPFSUrl, unpinFromPinata, uploadFileToPinata } from '@/lib/pinataUpload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const address = formData.get('address');
    const oldCid = formData.get('oldCid');

    if (!(file instanceof File) || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Image and wallet address are required.' }, { status: 400 });
    }

    const upload = await uploadFileToPinata(file);
    if (!upload.success) {
      const quotaExceeded = /plan usage limit|quota|storage limit/i.test(upload.error);
      return NextResponse.json(
        { error: upload.error },
        { status: quotaExceeded ? 429 : 502 },
      );
    }

    const cid = upload.data.IpfsHash;
    const avatarUrl = getIPFSUrl(cid);
    const normalizedAddress = address.trim();
    const now = new Date().toISOString();

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('address', normalizedAddress)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      await unpinFromPinata(cid);
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    const saveResult = existing
      ? await supabaseAdmin
          .from('profiles')
          .update({ avatar_cid: cid, avatar_url: avatarUrl, updated_at: now, last_active: now })
          .eq('id', existing.id)
      : await supabaseAdmin
          .from('profiles')
          .insert({ address: normalizedAddress, avatar_cid: cid, avatar_url: avatarUrl, updated_at: now, last_active: now });

    if (saveResult.error) {
      await unpinFromPinata(cid);
      return NextResponse.json({ error: saveResult.error.message }, { status: 500 });
    }

    if (typeof oldCid === 'string' && oldCid && oldCid !== cid) {
      void unpinFromPinata(oldCid);
    }

    return NextResponse.json({ success: true, cid, avatarUrl });
  } catch (error) {
    console.error('Profile avatar upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload profile picture.' }, { status: 500 });
  }
}
