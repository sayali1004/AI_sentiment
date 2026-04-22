"""FastAPI backend for AI Sentiment Observatory."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import pandas as pd
from datetime import date
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from groq import Groq, RateLimitError, APIStatusError

from config.settings import _get as get_setting

app = FastAPI(title="AI Sentiment Observatory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Clients (lazy singletons)
# ---------------------------------------------------------------------------

_supabase = None
_groq = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(get_setting("SUPABASE_URL"), get_setting("SUPABASE_ANON_KEY"))
    return _supabase


def get_groq():
    global _groq
    if _groq is None:
        _groq = Groq(api_key=get_setting("GROQ_API_KEY"))
    return _groq


# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------

FIPS_TO_ISO3 = {
    "AF": "AFG", "AL": "ALB", "AG": "DZA", "AO": "AGO", "AC": "ATG",
    "AR": "ARG", "AM": "ARM", "AS": "AUS", "AU": "AUT", "AJ": "AZE",
    "BF": "BHS", "BA": "BHR", "BG": "BGD", "BB": "BRB", "BO": "BLR",
    "BE": "BEL", "BH": "BLZ", "BN": "BEN", "BT": "BTN", "BL": "BOL",
    "BK": "BIH", "BC": "BWA", "BR": "BRA", "BX": "BRN", "BU": "BGR",
    "UV": "BFA", "BY": "BDI", "CB": "KHM", "CM": "CMR", "CA": "CAN",
    "CV": "CPV", "CT": "CAF", "CD": "TCD", "CI": "CHL", "CH": "CHN",
    "CO": "COL", "CN": "COM", "CF": "COG", "CG": "COD", "CS": "CRI",
    "IV": "CIV", "HR": "HRV", "CU": "CUB", "CY": "CYP", "EZ": "CZE",
    "DA": "DNK", "DJ": "DJI", "DO": "DMA", "DR": "DOM", "EC": "ECU",
    "EG": "EGY", "ES": "SLV", "EK": "GNQ", "ER": "ERI", "EN": "EST",
    "ET": "ETH", "FJ": "FJI", "FI": "FIN", "FR": "FRA", "GB": "GAB",
    "GA": "GMB", "GG": "GEO", "GM": "DEU", "GH": "GHA", "GR": "GRC",
    "GJ": "GRD", "GT": "GTM", "GV": "GIN", "PU": "GNB", "GY": "GUY",
    "HA": "HTI", "HO": "HND", "HU": "HUN", "IC": "ISL", "IN": "IND",
    "ID": "IDN", "IR": "IRN", "IZ": "IRQ", "EI": "IRL", "IS": "ISR",
    "IT": "ITA", "JM": "JAM", "JA": "JPN", "JO": "JOR", "KZ": "KAZ",
    "KE": "KEN", "KR": "KIR", "KN": "PRK", "KS": "KOR", "KU": "KWT",
    "KG": "KGZ", "LA": "LAO", "LG": "LVA", "LE": "LBN", "LT": "LSO",
    "LI": "LBR", "LY": "LBY", "LS": "LIE", "LH": "LTU", "LU": "LUX",
    "MK": "MKD", "MA": "MDG", "MI": "MWI", "MY": "MYS", "MV": "MDV",
    "ML": "MLI", "MT": "MLT", "RM": "MHL", "MR": "MRT", "MP": "MUS",
    "MX": "MEX", "FM": "FSM", "MD": "MDA", "MN": "MCO", "MG": "MNG",
    "MJ": "MNE", "MO": "MAR", "MZ": "MOZ", "BM": "MMR", "WA": "NAM",
    "NR": "NRU", "NP": "NPL", "NL": "NLD", "NZ": "NZL", "NU": "NIC",
    "NG": "NER", "NI": "NGA", "NO": "NOR", "MU": "OMN", "PK": "PAK",
    "PS": "PLW", "PM": "PAN", "PP": "PNG", "PA": "PRY", "PE": "PER",
    "RP": "PHL", "PL": "POL", "PO": "PRT", "QA": "QAT", "RO": "ROU",
    "RS": "RUS", "RW": "RWA", "SC": "KNA", "ST": "LCA", "VC": "VCT",
    "WS": "WSM", "SM": "SMR", "TP": "STP", "SA": "SAU", "SG": "SEN",
    "RI": "SRB", "SE": "SYC", "SL": "SLE", "SN": "SGP", "LO": "SVK",
    "SI": "SVN", "BP": "SLB", "SO": "SOM", "SF": "ZAF", "SP": "ESP",
    "CE": "LKA", "SU": "SDN", "NS": "SUR", "WZ": "SWZ", "SW": "SWE",
    "SZ": "CHE", "SY": "SYR", "TW": "TWN", "TI": "TJK", "TZ": "TZA",
    "TH": "THA", "TT": "TLS", "TO": "TGO", "TN": "TON", "TD": "TTO",
    "TS": "TUN", "TU": "TUR", "TX": "TKM", "TV": "TUV", "UG": "UGA",
    "UP": "UKR", "AE": "ARE", "UK": "GBR", "US": "USA", "UY": "URY",
    "UZ": "UZB", "NH": "VUT", "VE": "VEN", "VM": "VNM", "YM": "YEM",
    "ZA": "ZMB", "ZI": "ZWE",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rpc(name: str, params: dict) -> list:
    try:
        resp = get_supabase().rpc(name, params).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _to_float(v, default=0.0):
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _to_int(v, default=0):
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Sentiment endpoints
# ---------------------------------------------------------------------------

@app.get("/api/sentiment/country")
def sentiment_by_country(
    start_date: str,
    end_date: str,
    org_filter: Optional[list[str]] = Query(None),
):
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    data = _rpc("get_sentiment_by_country", params)

    # Fetch population for per-million calc
    pop_map = {}
    try:
        pop_resp = get_supabase().table("countries").select("fips_code,population").execute()
        if pop_resp.data:
            for row in pop_resp.data:
                pop = _to_float(row.get("population"))
                if pop > 0:
                    pop_map[row["fips_code"]] = pop
    except Exception:
        pass

    result = []
    for row in data:
        code = (row.get("country_code") or "").strip()
        count = _to_int(row.get("article_count"))
        tone = _to_float(row.get("avg_tone"))
        pop = pop_map.get(code)
        result.append({
            "country_code": code,
            "iso3": FIPS_TO_ISO3.get(code),
            "avg_tone": round(tone, 3),
            "article_count": count,
            "articles_per_million": round(count * 1e6 / pop, 2) if pop else None,
        })
    return result


@app.get("/api/sentiment/us-state")
def sentiment_by_us_state(
    start_date: str,
    end_date: str,
    org_filter: Optional[list[str]] = Query(None),
):
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    data = _rpc("get_sentiment_by_us_state", params)

    result = []
    for row in data:
        adm1 = row.get("adm1_code", "")
        if adm1 == "US":
            continue
        state_abbr = adm1[-2:].upper() if adm1 else None
        result.append({
            "adm1_code": adm1,
            "state_abbr": state_abbr,
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        })
    return result


@app.get("/api/sentiment/timeseries")
def sentiment_timeseries(
    start_date: str,
    end_date: str,
    org_filter: Optional[list[str]] = Query(None),
):
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    data = _rpc("get_sentiment_timeseries", params)
    return [
        {
            "date": row.get("date"),
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        }
        for row in data
    ]


@app.get("/api/sentiment/timeseries-per-org")
def timeseries_per_org(
    start_date: str,
    end_date: str,
    org_list: Optional[list[str]] = Query(None),
):
    if not org_list:
        return []
    data = _rpc("get_timeseries_per_org", {
        "start_date": start_date,
        "end_date": end_date,
        "org_list": org_list,
    })
    return [
        {
            "date": row.get("date"),
            "org_name": row.get("org_name"),
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        }
        for row in data
    ]


@app.get("/api/sentiment/by-org")
def sentiment_by_org(
    start_date: str,
    end_date: str,
    org_list: Optional[list[str]] = Query(None),
):
    if not org_list:
        return []
    data = _rpc("get_sentiment_by_org", {
        "start_date": start_date,
        "end_date": end_date,
        "org_list": org_list,
    })
    return [
        {
            "org_name": row.get("org_name"),
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        }
        for row in data
    ]


@app.get("/api/sentiment/timeseries-by-country")
def timeseries_by_country(
    start_date: str,
    end_date: str,
    country_code: str = "US",
    org_filter: Optional[list[str]] = Query(None),
):
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "country_code": country_code,
    }
    if org_filter:
        params["org_filter"] = org_filter
    data = _rpc("get_sentiment_timeseries_by_country", params)
    return [
        {
            "date": row.get("date"),
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        }
        for row in data
    ]


@app.get("/api/sentiment/timeseries-per-org-by-country")
def timeseries_per_org_by_country(
    start_date: str,
    end_date: str,
    country_code: str = "US",
    org_list: Optional[list[str]] = Query(None),
):
    if not org_list:
        return []
    data = _rpc("get_timeseries_per_org_by_country", {
        "start_date": start_date,
        "end_date": end_date,
        "country_code": country_code,
        "org_list": org_list,
    })
    return [
        {
            "date": row.get("date"),
            "org_name": row.get("org_name"),
            "avg_tone": round(_to_float(row.get("avg_tone")), 3),
            "article_count": _to_int(row.get("article_count")),
        }
        for row in data
    ]


# ---------------------------------------------------------------------------
# Chatbot
# ---------------------------------------------------------------------------

CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_sentiment_by_country",
            "description": (
                "Get average AI news sentiment and article count aggregated by country "
                "for a date range. Use this for geographic comparisons."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "end_date":   {"type": "string", "description": "End date YYYY-MM-DD"},
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sentiment_timeseries",
            "description": (
                "Get daily AI sentiment and article volume over time. "
                "Use to spot trends, spikes, or drops. "
                "Optionally filter by specific companies."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "end_date":   {"type": "string", "description": "End date YYYY-MM-DD"},
                    "org_filter": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Optional company filter. Valid values: anthropic, openai, "
                            "google, microsoft, meta, nvidia, amazon, apple, xai, "
                            "mistral, deepseek, anduril, palantir, department_of_defense, data_center"
                        ),
                    },
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sentiment_by_org",
            "description": (
                "Get average AI sentiment and article count per company for a date range. "
                "Use to compare companies or answer questions about a specific company."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "end_date":   {"type": "string", "description": "End date YYYY-MM-DD"},
                    "org_list": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Companies to query. Valid values: anthropic, openai, "
                            "google, microsoft, meta, nvidia, amazon, apple, xai, "
                            "mistral, deepseek, anduril, palantir, department_of_defense"
                        ),
                    },
                },
                "required": ["start_date", "end_date", "org_list"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_headlines",
            "description": (
                "Fetch article headlines to understand what narratives are driving sentiment. "
                "Use for 'why' questions, 'summarize' questions, or to explain tone changes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date":   {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "end_date":     {"type": "string", "description": "End date YYYY-MM-DD"},
                    "country_code": {"type": "string", "description": "Optional 2-letter FIPS country code"},
                    "org_filter":   {"type": "string", "description": "Optional single org name"},
                    "sort_by": {
                        "type": "string",
                        "enum": ["recent", "most_negative", "most_positive"],
                    },
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sentiment_by_us_state",
            "description": "Get average AI sentiment and article count by US state for a date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string"},
                    "end_date":   {"type": "string"},
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "semantic_search_articles",
            "description": (
                "Find articles semantically similar to a topic using vector search. "
                "Best for 'why', 'what is driving', 'summarize' questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query":        {"type": "string"},
                    "start_date":   {"type": "string"},
                    "end_date":     {"type": "string"},
                    "country_code": {"type": "string"},
                    "org_filter":   {"type": "string"},
                },
                "required": ["query", "start_date", "end_date"],
            },
        },
    },
]


def _execute_tool(tool_name: str, args: dict) -> str:
    client = get_supabase()

    if tool_name == "get_sentiment_by_country":
        resp = client.rpc("get_sentiment_by_country", {
            "start_date": args["start_date"],
            "end_date":   args["end_date"],
        }).execute()
        if not resp.data:
            return "No country data found."
        df = pd.DataFrame(resp.data).sort_values("article_count", ascending=False).head(30)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce").round(2)
        return _truncate(f"Top 30 countries by volume:\n{df[['country_code','avg_tone','article_count']].to_string(index=False)}")

    if tool_name == "get_sentiment_timeseries":
        params = {"start_date": args["start_date"], "end_date": args["end_date"]}
        if args.get("org_filter"):
            params["org_filter"] = args["org_filter"]
        resp = client.rpc("get_sentiment_timeseries", params).execute()
        if not resp.data:
            return "No timeseries data found."
        df = pd.DataFrame(resp.data)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce").round(2)
        return _truncate(f"Daily sentiment ({len(df)} days):\n{df[['date','avg_tone','article_count']].to_string(index=False)}")

    if tool_name == "get_sentiment_by_org":
        resp = client.rpc("get_sentiment_by_org", {
            "start_date": args["start_date"],
            "end_date":   args["end_date"],
            "org_list":   args["org_list"],
        }).execute()
        if not resp.data:
            return "No organization data found."
        df = pd.DataFrame(resp.data).sort_values("avg_tone")
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce").round(2)
        return _truncate(f"Sentiment by company:\n{df.to_string(index=False)}")

    if tool_name == "get_recent_headlines":
        # Cap at 25 headlines to stay within 8B model context limits
        limit = min(int(args.get("limit", 25)), 25)
        sort_by = args.get("sort_by", "recent")
        q = client.table("articles").select(
            "title, published_date, avg_tone"
        ).gte("published_date", args["start_date"]).lte("published_date", args["end_date"])
        if args.get("country_code"):
            q = q.eq("mentioned_country_code", args["country_code"].upper().strip())
        if args.get("org_filter"):
            q = q.contains("organizations", [args["org_filter"]])
        if sort_by == "most_negative":
            q = q.order("avg_tone", desc=False)
        elif sort_by == "most_positive":
            q = q.order("avg_tone", desc=True)
        else:
            q = q.order("published_date", desc=True)
        resp = q.limit(limit).execute()
        if not resp.data:
            return "No headlines found."
        df = pd.DataFrame(resp.data)
        df = df[~df["title"].str.startswith("http", na=False)]
        if df.empty:
            return "No page titles available."
        lines = []
        for _, row in df.iterrows():
            tone = f"{row['avg_tone']:.1f}" if pd.notna(row.get("avg_tone")) else "N/A"
            title = str(row["title"])[:120]  # truncate very long titles
            lines.append(f"[{row['published_date']}] (tone:{tone}) {title}")
        return _truncate(f"Headlines ({len(lines)}):\n" + "\n".join(lines))

    if tool_name == "get_sentiment_by_us_state":
        resp = client.rpc("get_sentiment_by_us_state", {
            "start_date": args["start_date"],
            "end_date":   args["end_date"],
        }).execute()
        if not resp.data:
            return "No US state data found."
        df = pd.DataFrame(resp.data).sort_values("article_count", ascending=False)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce").round(2)
        return _truncate(f"US state sentiment ({len(df)} states):\n{df[['adm1_code','avg_tone','article_count']].to_string(index=False)}")

    if tool_name == "semantic_search_articles":
        from pipeline.embed import embed_texts
        query_vec = embed_texts([args["query"]])[0]
        # Cap at 15 results to keep context small enough for 8B fallback
        params = {
            "query_embedding": query_vec,
            "match_count": 15,
            "filter_start_date": args["start_date"],
            "filter_end_date": args["end_date"],
        }
        if args.get("country_code"):
            params["filter_country"] = args["country_code"].upper().strip()
        if args.get("org_filter"):
            params["filter_org"] = args["org_filter"]
        resp = client.rpc("match_articles", params).execute()
        if not resp.data:
            return "No semantically similar articles found."
        df = pd.DataFrame(resp.data)
        lines = []
        for _, row in df.iterrows():
            tone = f"{row['avg_tone']:.1f}" if pd.notna(row.get("avg_tone")) else "N/A"
            sim = f"{row['similarity']:.2f}" if pd.notna(row.get("similarity")) else ""
            title = str(row.get("title", ""))[:120]
            lines.append(f"[{row['published_date']}] (tone:{tone} sim:{sim}) {title}")
        return _truncate(f"Relevant articles ({len(lines)}):\n" + "\n".join(lines))

    return f"Unknown tool: {tool_name}"


def _truncate(text: str, max_chars: int = 2800) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n[truncated — {len(text) - max_chars} chars omitted]"


_SYSTEM_PROMPT = f"""You are an AI sentiment analyst with access to a live database of global \
news articles about AI from GDELT. Each article has an avg_tone score: positive = favorable, \
negative = critical, near zero = neutral. Range is roughly -10 to +10; above +2 is notably \
positive, below -2 is notably negative.

Today is {date.today().isoformat()}. Data covers the last 12 months.

Available companies/tags: anthropic, openai, google, microsoft, meta, nvidia, amazon, apple, \
xai, mistral, deepseek, anduril, palantir, department_of_defense, data_center.

RULES — follow every one:
1. Never guess numbers. Always call tools first.
2. Default date range: last 30 days when the user does not specify.
3. For "most negative / most positive / headlines / articles / what articles / show me" \
questions: use get_recent_headlines with sort_by=most_negative or sort_by=most_positive, \
and list the specific articles with date and tone score.
4. For "why / what's driving / summarize / what's behind" questions: use semantic_search_articles.
5. For trend / over time questions: call get_sentiment_timeseries.
6. For simple sentiment questions (scores, rankings, comparisons): just return the numbers \
concisely — do NOT fetch headlines unless the user asked for them.
7. Only show article headlines when the user explicitly asks for articles, headlines, \
specific news, examples, or sources.
8. When you do show articles, format them as:
   • [YYYY-MM-DD] (tone: X.X) "Headline text"
9. Be concise. Lead with the key finding, then supporting detail."""


class ChatRequest(BaseModel):
    user_message: str
    history: list[dict] = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    base_messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    base_messages.extend(req.history)
    base_messages.append({"role": "user", "content": req.user_message})

    def _call_model(model: str) -> str:
        msgs = base_messages.copy()
        for _ in range(6):
            response = get_groq().chat.completions.create(
                model=model,
                messages=msgs,
                tools=CHAT_TOOLS,
                tool_choice="auto",
                temperature=0.2,
            )
            choice = response.choices[0]
            assistant_msg: dict = {"role": "assistant", "content": choice.message.content or ""}
            if choice.message.tool_calls:
                assistant_msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in choice.message.tool_calls
                ]
            msgs.append(assistant_msg)
            if choice.finish_reason != "tool_calls":
                return choice.message.content or "No response generated."
            for tc in choice.message.tool_calls:
                tool_args = json.loads(tc.function.arguments)
                result = _execute_tool(tc.function.name, tool_args)
                msgs.append({"role": "tool", "tool_call_id": tc.id, "content": result})
        return "Reached the maximum number of steps. Please try a more specific question."

    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            return {"reply": _call_model(model)}
        except (RateLimitError, APIStatusError):
            continue

    return {"reply": "Both Groq models are currently unavailable (rate limit or context too large). Please try again in a few minutes."}
