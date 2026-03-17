import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Get current month range
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();

        // 2. Fetch expenses and profile budget
        const [{ data: expenses }, { data: profile }] = await Promise.all([
            supabase.from("expenses").select("amount").eq("user_id", user.id).gte("date", firstDay),
            supabase.from("profiles").select("monthly_budget").eq("id", user.id).single()
        ]);

        const totalSpent = (expenses || []).reduce((acc, e) => acc + Number(e.amount), 0);
        const budget = profile?.monthly_budget || 2000;

        // 3. Projections
        const velocity = totalSpent / currentDay; // $/day
        const projection = velocity * lastDay;
        const isOverBudget = projection > budget;
        const percentage = (totalSpent / budget) * 100;

        return Response.json({
            totalSpent,
            budget,
            projection,
            isOverBudget,
            percentage,
            daysRemaining: lastDay - currentDay
        });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Failed to fetch projections" }, { status: 500 });
    }
}
