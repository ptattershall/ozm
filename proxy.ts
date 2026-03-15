import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- proxy receives request for future use
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
