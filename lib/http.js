import { NextResponse } from 'next/server';

export const ok = (data = {}) => NextResponse.json({ ok: true, ...data });
export const fail = (status, error) => NextResponse.json({ ok: false, error }, { status });
