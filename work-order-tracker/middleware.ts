import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Buat response dasar dulu
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Jika bensin belum ada, jangan dipaksa. Biarkan halaman terbuka dulu.
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Middleware: Environment variables missing");
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Cek User - Pakai getUser() karena lebih akurat untuk keamanan
    const { data: { user } } = await supabase.auth.getUser()

    // Logika Redirect
    const isLoginPage = request.nextUrl.pathname.startsWith('/login')
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

    if (!user && !isLoginPage && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }

  } catch (error) {
    // JIKA TERJADI ERROR APAPUN, JANGAN TAMPILKAN HALAMAN 500
    // Biarkan request lewat saja (NextResponse.next)
    console.error("Middleware crash handled:", error);
    return response;
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}