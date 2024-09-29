import { corsHeaders } from '../_shared/cors.ts'
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { name } = await req.json()
    const testSecretKey = Deno.env.get('TEST_SECRET_KEY')

    const data = {
      message: `Hello ${name}! I know your secret is ${testSecretKey}`,
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  }
})
