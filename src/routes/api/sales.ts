import { SaleDataT } from "@/types";
import { Database } from "@/sql";
import { createKysely } from "@vercel/postgres-kysely";

function nestObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
        const fragments = key.split("_");
        let current = result;
        for (let i = 0; i < fragments.length - 1; i++) {
            const part = fragments[i];
            current[part] ??= {};
            current = current[part];
        }
        current[fragments[fragments.length - 1]] = val;
    }
    return result;
}

// TODO
const revalidate = 3600;

const db = createKysely<Database>();

export async function GET() {
    try {
        const result = await db.selectFrom("sales").selectAll().execute();
        return Response.json(
            result.map(sale => nestObject(sale) as SaleDataT),
            {
                status: 200,
                headers: {
                    "Cache-Control": `max-age=${revalidate}`,
                },
            }
        );
    } catch (error) {
        console.error("db fetch for sales failed: " + error);
    }

    return Response.json([], { status: 500 });
}
