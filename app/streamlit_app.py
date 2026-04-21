"""AI Sentiment Dashboard — Streamlit App."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import pycountry
from datetime import date, timedelta
from supabase import create_client

st.set_page_config(page_title="AI Sentiment Dashboard", layout="wide", page_icon="🌍")

st.markdown("""
<style>
/* Gradient page header */
.block-container h1 {
    background: linear-gradient(90deg, #E11D48, #FB7185, #FBBF24);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
}

/* Subtle gradient accent on tab headers */
.stTabs [data-baseweb="tab-list"] {
    gap: 4px;
    background: #FFF0EE;
    border-radius: 12px;
    padding: 4px;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 8px;
    padding: 6px 16px;
    font-weight: 500;
}
.stTabs [aria-selected="true"] {
    background: white !important;
    box-shadow: 0 1px 4px rgba(225,29,72,0.15);
}

/* Metric cards — soft rose left border */
[data-testid="stMetric"] {
    background: white;
    border-left: 4px solid #E11D48;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* Sidebar background */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #FFE4E6 0%, #FFF8F7 100%);
}

/* Dividers — rose tint */
hr {
    border-color: #FECDD3 !important;
}
</style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------------
# Supabase client helpers
# ------------------------------------------------------------------

def _get_setting(key: str) -> str:
    """Read from Streamlit secrets (cloud) or env vars (local)."""
    try:
        if key in st.secrets:
            return st.secrets[key]
    except Exception:
        pass
    from config.settings import _get
    return _get(key)


@st.cache_resource
def get_supabase_client():
    url = _get_setting("SUPABASE_URL")
    key = _get_setting("SUPABASE_ANON_KEY")
    return create_client(url, key)


# ------------------------------------------------------------------
# Fetch functions (all cached ttl=3600)
# ------------------------------------------------------------------

def _safe_rpc(rpc_name: str, params: dict, empty_cols: list[str]) -> tuple[pd.DataFrame, str | None]:
    """Call a Supabase RPC. Returns (DataFrame, error_message_or_None)."""
    try:
        client = get_supabase_client()
        response = client.rpc(rpc_name, params).execute()
        if response.data:
            return pd.DataFrame(response.data), None
        return pd.DataFrame(columns=empty_cols), None
    except Exception as e:
        return pd.DataFrame(columns=empty_cols), str(e)


@st.cache_data(ttl=3600)
def fetch_sentiment_by_country(
    start_date: str, end_date: str, org_filter: list[str] | None = None
) -> tuple[pd.DataFrame, str | None]:
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    df, err = _safe_rpc("get_sentiment_by_country", params, ["country_code", "avg_tone", "article_count"])
    if not df.empty:
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=86400)
def fetch_countries() -> pd.DataFrame:
    try:
        client = get_supabase_client()
        response = client.table("countries").select("fips_code,population").execute()
        if response.data:
            return pd.DataFrame(response.data)
    except Exception:
        pass
    return pd.DataFrame(columns=["fips_code", "population"])


@st.cache_data(ttl=3600)
def fetch_sentiment_by_us_state(
    start_date: str, end_date: str, org_filter: list[str] | None = None
) -> tuple[pd.DataFrame, str | None]:
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    df, err = _safe_rpc("get_sentiment_by_us_state", params, ["adm1_code", "avg_tone", "article_count"])
    if not df.empty:
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=3600)
def fetch_sentiment_timeseries(
    start_date: str,
    end_date: str,
    org_filter: list[str] | None = None,
) -> tuple[pd.DataFrame, str | None]:
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
    df, err = _safe_rpc("get_sentiment_timeseries", params, ["date", "avg_tone", "article_count"])
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=3600)
def fetch_timeseries_per_org(
    start_date: str,
    end_date: str,
    org_list: list[str],
) -> tuple[pd.DataFrame, str | None]:
    df, err = _safe_rpc(
        "get_timeseries_per_org",
        {"start_date": start_date, "end_date": end_date, "org_list": org_list},
        ["date", "org_name", "avg_tone", "article_count"],
    )
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=3600)
def fetch_sentiment_by_org(
    start_date: str,
    end_date: str,
    org_list: list[str],
) -> tuple[pd.DataFrame, str | None]:
    df, err = _safe_rpc(
        "get_sentiment_by_org",
        {"start_date": start_date, "end_date": end_date, "org_list": org_list},
        ["org_name", "avg_tone", "article_count"],
    )
    if not df.empty:
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=3600)
def fetch_sentiment_timeseries_by_country(
    start_date: str,
    end_date: str,
    country_code: str,
    org_filter: list[str] | None = None,
) -> tuple[pd.DataFrame, str | None]:
    params = {"start_date": start_date, "end_date": end_date, "country_code": country_code}
    if org_filter:
        params["org_filter"] = org_filter
    df, err = _safe_rpc("get_sentiment_timeseries_by_country", params, ["date", "avg_tone", "article_count"])
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


@st.cache_data(ttl=3600)
def fetch_timeseries_per_org_by_country(
    start_date: str,
    end_date: str,
    country_code: str,
    org_list: list[str],
) -> tuple[pd.DataFrame, str | None]:
    df, err = _safe_rpc(
        "get_timeseries_per_org_by_country",
        {
            "start_date": start_date,
            "end_date": end_date,
            "country_code": country_code,
            "org_list": org_list,
        },
        ["date", "org_name", "avg_tone", "article_count"],
    )
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["article_count"] = pd.to_numeric(df["article_count"], errors="coerce").fillna(0).astype(int)
        df["avg_tone"] = pd.to_numeric(df["avg_tone"], errors="coerce")
    return df, err


# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

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

# GDELT adm1 codes for US states → Plotly USA-states abbreviations
GDELT_ADM1_TO_STATE = {
    "US01": "AL", "US02": "AK", "US04": "AZ", "US05": "AR", "US06": "CA",
    "US08": "CO", "US09": "CT", "US10": "DE", "US11": "DC", "US12": "FL",
    "US13": "GA", "US15": "HI", "US16": "ID", "US17": "IL", "US18": "IN",
    "US19": "IA", "US20": "KS", "US21": "KY", "US22": "LA", "US23": "ME",
    "US24": "MD", "US25": "MA", "US26": "MI", "US27": "MN", "US28": "MS",
    "US29": "MO", "US30": "MT", "US31": "NE", "US32": "NV", "US33": "NH",
    "US34": "NJ", "US35": "NM", "US36": "NY", "US37": "NC", "US38": "ND",
    "US39": "OH", "US40": "OK", "US41": "OR", "US42": "PA", "US44": "RI",
    "US45": "SC", "US46": "SD", "US47": "TN", "US48": "TX", "US49": "UT",
    "US50": "VT", "US51": "VA", "US53": "WA", "US54": "WV", "US55": "WI",
    "US56": "WY",
}

SENTIMENT_COLOR_SCALE = [
    [0.0,  "#d73027"],
    [0.15, "#f46d43"],
    [0.25, "#fdae61"],
    [0.35, "#fee08b"],
    [0.45, "#ffffbf"],
    [0.55, "#d9ef8b"],
    [0.65, "#a6d96a"],
    [0.75, "#66bd63"],
    [0.85, "#1a9850"],
    [1.0,  "#006837"],
]

def _fips_to_name(fips: str) -> str:
    iso3 = FIPS_TO_ISO3.get(fips)
    if iso3:
        country = pycountry.countries.get(alpha_3=iso3)
        if country:
            return country.name
    return fips

ALL_ORGS = [
    "anthropic", "openai", "google", "microsoft", "meta", "nvidia",
    "amazon", "apple", "xai", "mistral", "deepseek",
    "anduril", "palantir", "department_of_defense",
]
FOUNDATION_MODEL_ORGS = ["anthropic", "openai", "google", "meta", "xai", "mistral", "deepseek"]
WEAPONS_ORGS = ["anduril", "palantir"]
GOVERNMENT_ORGS = ["department_of_defense"]
BIG_TECH_ORGS = ["microsoft", "nvidia", "amazon", "apple"]


# ------------------------------------------------------------------
# Sidebar (applies to Tabs 1, 2, and 4)
# ------------------------------------------------------------------

st.sidebar.title("Filters")
today = date.today()
default_start = today - timedelta(days=30)
min_date = today - timedelta(days=365)

start_date = st.sidebar.date_input(
    "Start date", value=default_start, min_value=min_date, max_value=today
)
end_date = st.sidebar.date_input(
    "End date", value=today, min_value=min_date, max_value=today
)

if start_date > end_date:
    st.sidebar.error("Start date must be before end date.")
    st.stop()


# ------------------------------------------------------------------
# Title
# ------------------------------------------------------------------

st.title("AI Sentiment Dashboard")

# ------------------------------------------------------------------
# Tabs
# ------------------------------------------------------------------

tab0, tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "ℹ️ About",
    "🌍 Worldwide",
    "🇺🇸 US",
    "🏈 Super Bowl",
    "🏗️ Data Centers",
    "🏢 Company Comparison",
    "💬 Ask the Data",
])


# ==================================================================
# TAB 0 — About
# ==================================================================

with tab0:

    st.markdown("## AI Sentiment Heatmap")
    st.markdown("##### *Tracking how the world feels about AI — one headline at a time.*")
    st.divider()

    # ---- Why this project ----
    col_why, col_what = st.columns(2)

    with col_why:
        st.markdown("### Why")
        st.markdown(
            """
            Investors, analysts, and researchers with a stake in the AI industry
            lack a clear, real-time view of how global media sentiment toward AI is shifting.

            Existing tools don't make it easy to spot **geographic or temporal patterns**
            that could signal inflection points — like the *"AI bubble"* deflating,
            a regulatory crackdown, or a breakthrough moment driving positive coverage.
            """
        )

    with col_what:
        st.markdown("### What")
        st.markdown(
            """
            An open-source web dashboard that visualises **global news sentiment about AI**
            using data from the [GDELT Project](https://www.gdeltproject.org/) —
            one of the largest open databases of world news events.

            It combines GDELT's built-in tone scores with a **RAG-powered chatbot**
            that lets you ask natural language questions directly about the data.
            """
        )

    st.divider()

    # ---- Goals & objectives ----
    st.markdown("### Goals & Objectives")
    g1, g2, g3 = st.columns(3)
    with g1:
        st.markdown(
            """
            **Track AI Sentiment**
            Monitor how global media coverage of AI shifts over time across countries,
            companies, and themes.
            """
        )
    with g2:
        st.markdown(
            """
            **Surface Patterns Early**
            Identify geographic and temporal signals — spikes, drops, regional divergence —
            before they become mainstream narratives.
            """
        )
    with g3:
        st.markdown(
            """
            **Enable Natural Language Queries**
            Let users ask plain-English questions about the data instead of writing SQL
            or interpreting raw charts.
            """
        )

    st.divider()

    # ---- Key features ----
    st.markdown("### Key Features")
    f1, f2, f3, f4 = st.columns(4)
    with f1:
        st.markdown("**🌍 World Heatmap**\nCountry-level sentiment map with date range filter")
    with f2:
        st.markdown("**🇺🇸 US State Map**\nState-level breakdown of AI news sentiment")
    with f3:
        st.markdown("**📈 Trend Analysis**\nDaily sentiment and volume timeseries by company")
    with f4:
        st.markdown("**💬 RAG Chatbot**\nAsk questions — answered with real data from the DB")

    st.divider()

    # ---- Use cases ----
    st.markdown("### Use Cases")
    st.markdown(
        """
        | Who | How they use it |
        |---|---|
        | **Investors** | Monitor AI sentiment shifts as a signal for sector exposure |
        | **Analysts** | Compare coverage of AI companies across regions and time |
        | **Journalists** | Spot emerging narratives in AI news before they peak |
        | **Researchers** | Study how public media frames AI risk, progress, and policy |
        | **Students** | Explore real-world data engineering and NLP pipelines |
        """
    )

    st.divider()

    # ---- Tech stack ----
    st.markdown("### Tech Stack")
    st.markdown(
        """
        | Layer | Technology |
        |---|---|
        | News Data | GDELT Project via Google BigQuery |
        | Pipeline | Python · pandas · GitHub Actions (daily cron) |
        | Database | Supabase (PostgreSQL + pgvector) |
        | Embeddings | all-MiniLM-L6-v2 (384-dim, sentence-transformers) |
        | LLM | Llama 3.3 70B / 3.1 8B via Groq API |
        | Dashboard | Streamlit · Plotly |
        """
    )

    st.divider()

    # ---- Team ----
    st.markdown("### Team")

    CARD_STYLE = """
        <div style="
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            background: #fafafa;
            height: 100%;
        ">
            <div style="
                width: 100px; height: 100px;
                border-radius: 50%;
                background: #e0e0e0;
                margin: 0 auto 16px auto;
                display: flex; align-items: center; justify-content: center;
                font-size: 36px; color: #aaa;
            ">📷</div>
            <h4 style="margin: 0 0 4px 0;">{name}</h4>
            <a href="{github}" target="_blank" style="font-size: 13px; color: #555;">
                GitHub →
            </a>
            <p style="font-size: 13px; color: #666; margin-top: 12px;">{bio}</p>
        </div>
    """

    LOREM = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
        "Ut enim ad minim veniam, quis nostrud exercitation."
    )

    team_col1, team_col2 = st.columns(2)

    with team_col1:
        st.markdown(
            CARD_STYLE.format(
                name="Jet Van Genuchten",
                github="https://github.com/HenriettePlane",
                bio=LOREM,
            ),
            unsafe_allow_html=True,
        )

    with team_col2:
        st.markdown(
            CARD_STYLE.format(
                name="Sayali Shelke",
                github="https://github.com/sayali1004",
                bio=LOREM,
            ),
            unsafe_allow_html=True,
        )


# ==================================================================
# TAB 1 — Worldwide Sentiment
# ==================================================================

with tab1:
    st.header("Worldwide AI Sentiment")
    st.caption(f"Showing data from {start_date} to {end_date}")

    df_world, err_world = fetch_sentiment_by_country(start_date.isoformat(), end_date.isoformat())
    if err_world:
        st.warning(f"Error loading country data: {err_world}")

    if df_world.empty:
        st.info("No data available for the selected date range.")
    else:
        # Strip trailing whitespace from country_code (Postgres CHAR(2) bug fix)
        df_world["country_code"] = df_world["country_code"].str.strip()

        # Population join in Python
        df_countries = fetch_countries()
        if not df_countries.empty:
            df_countries["population"] = pd.to_numeric(df_countries["population"], errors="coerce")
            df_world = df_world.merge(df_countries, left_on="country_code", right_on="fips_code", how="left")
            df_world["articles_per_million"] = df_world.apply(
                lambda r: r["article_count"] * 1e6 / r["population"] if pd.notna(r.get("population")) and r["population"] > 0 else None,
                axis=1,
            )
        else:
            df_world["articles_per_million"] = None

        # ---- Country filter ----
        country_options = sorted(df_world["country_code"].dropna().unique().tolist(), key=_fips_to_name)
        selected_countries = st.multiselect(
            "Filter by country",
            options=country_options,
            default=[],
            format_func=_fips_to_name,
            key="world_country_filter",
        )
        df_world_filtered = (
            df_world if not selected_countries
            else df_world[df_world["country_code"].isin(selected_countries)]
        )

        # ---- KPI row ----
        total_articles = int(df_world_filtered["article_count"].sum())
        countries_covered = int(df_world_filtered["country_code"].nunique())
        avg_tone = float(df_world_filtered["avg_tone"].mean()) if not df_world_filtered.empty else 0.0

        kpi1, kpi2, kpi3 = st.columns(3)
        kpi1.metric("Total Articles", f"{total_articles:,}")
        kpi2.metric("Countries Covered", countries_covered)
        kpi3.metric("Avg Tone", f"{avg_tone:.2f}")

        st.divider()

        # ---- Section: Overall Trends ----
        st.subheader("Overall Trends")
        if len(selected_countries) == 1:
            df_ts_all, err_ts_all = fetch_sentiment_timeseries_by_country(
                start_date.isoformat(), end_date.isoformat(), selected_countries[0]
            )
        else:
            df_ts_all, err_ts_all = fetch_sentiment_timeseries(start_date.isoformat(), end_date.isoformat())
        if err_ts_all:
            st.warning(f"Error loading timeseries data: {err_ts_all}")

        if df_ts_all.empty:
            st.info("No timeseries data available.")
        else:
            col_left, col_right = st.columns(2)

            with col_left:
                fig_vol = px.line(
                    df_ts_all,
                    x="date",
                    y="article_count",
                    title="Daily Article Volume (All AI)",
                    labels={"date": "Date", "article_count": "Article Count"},
                )
                fig_vol.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_vol, use_container_width=True)

            with col_right:
                fig_tone = px.line(
                    df_ts_all,
                    x="date",
                    y="avg_tone",
                    title="Daily Avg Tone (All AI)",
                    labels={"date": "Date", "avg_tone": "Avg Tone"},
                )
                fig_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_tone.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_tone, use_container_width=True)

        st.divider()

        # ---- Section: World Map ----
        st.subheader("World Map")

        map_metric = st.radio(
            "Color map by",
            ["Avg Sentiment", "Total Volume", "Volume per Million People"],
            horizontal=True,
            key="world_map_metric",
        )

        df_world["iso3"] = df_world["country_code"].map(FIPS_TO_ISO3)
        df_mapped = df_world.dropna(subset=["iso3"])

        if df_mapped.empty:
            st.info("No mappable country data available.")
        else:
            fig_map = None

            if map_metric == "Avg Sentiment":
                fig_map = px.choropleth(
                    df_mapped,
                    locations="iso3",
                    locationmode="ISO-3",
                    color="avg_tone",
                    hover_name="country_code",
                    hover_data={
                        "article_count": True,
                        "avg_tone": ":.2f",
                        "iso3": False,
                    },
                    color_continuous_scale=SENTIMENT_COLOR_SCALE,
                    range_color=[-5, 5],
                    title="Average Sentiment by Country",
                )
            elif map_metric == "Total Volume":
                fig_map = px.choropleth(
                    df_mapped,
                    locations="iso3",
                    locationmode="ISO-3",
                    color="article_count",
                    hover_name="country_code",
                    hover_data={
                        "article_count": True,
                        "avg_tone": ":.2f",
                        "iso3": False,
                    },
                    color_continuous_scale="Blues",
                    title="Article Volume by Country",
                )
            else:
                df_apm = df_mapped.dropna(subset=["articles_per_million"])
                if df_apm.empty:
                    st.info("No population data available for per-million calculation.")
                else:
                    fig_map = px.choropleth(
                        df_apm,
                        locations="iso3",
                        locationmode="ISO-3",
                        color="articles_per_million",
                        hover_name="country_code",
                        hover_data={
                            "article_count": True,
                            "articles_per_million": ":.2f",
                            "iso3": False,
                        },
                        color_continuous_scale="Blues",
                        range_color=[0, 120],
                        title="Article Volume per Million People",
                    )

            if fig_map is not None:
                fig_map.update_layout(
                    geo=dict(
                        showframe=False,
                        showcoastlines=True,
                        projection_type="natural earth",
                    ),
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_map, use_container_width=True)

        with st.expander("Raw country data"):
            st.dataframe(
                df_world.sort_values("article_count", ascending=False),
                use_container_width=True,
            )


# ==================================================================
# TAB 2 — US Sentiment
# ==================================================================

with tab2:
    st.header("US AI Sentiment")
    st.caption(f"Showing data from {start_date} to {end_date}")

    df_us_state, err_us_state = fetch_sentiment_by_us_state(start_date.isoformat(), end_date.isoformat())
    if err_us_state:
        st.warning(f"Error loading US state data: {err_us_state}")

    if df_us_state.empty:
        st.info("No US state data available for the selected date range.")
    else:
        # Map adm1 codes: RPC returns "USCA"-style codes.
        # Extract last 2 chars to get state abbreviation (e.g. "USCA"[-2:] = "CA").
        # Filter out rows where adm1_code is exactly "US" (length 2) — those are uncategorized.
        df_us_state = df_us_state[df_us_state["adm1_code"] != "US"].copy()
        df_us_state["state_abbr"] = df_us_state["adm1_code"].str[-2:].str.upper()
        df_us_mapped = df_us_state.dropna(subset=["state_abbr"])

        # ---- KPI row ----
        us_total_articles = int(df_us_state["article_count"].sum())
        states_covered = int(df_us_mapped["state_abbr"].nunique())
        us_avg_tone = float(df_us_state["avg_tone"].mean())

        kpi1, kpi2, kpi3 = st.columns(3)
        kpi1.metric("Total US Articles", f"{us_total_articles:,}")
        kpi2.metric("States Covered", states_covered)
        kpi3.metric("US Avg Tone", f"{us_avg_tone:.2f}")

        st.divider()

        # ---- Section: Overall US Trends ----
        st.subheader("Overall US Trends")

        df_us_ts, err_us_ts = fetch_sentiment_timeseries_by_country(
            start_date.isoformat(), end_date.isoformat(), "US"
        )
        if err_us_ts:
            st.warning(f"Error loading US timeseries data: {err_us_ts}")

        if df_us_ts.empty:
            st.info("No US timeseries data available.")
        else:
            col_left, col_right = st.columns(2)

            with col_left:
                fig_us_vol = px.line(
                    df_us_ts,
                    x="date",
                    y="article_count",
                    title="Daily Article Volume (US)",
                    labels={"date": "Date", "article_count": "Article Count"},
                )
                fig_us_vol.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_us_vol, use_container_width=True)

            with col_right:
                fig_us_tone = px.line(
                    df_us_ts,
                    x="date",
                    y="avg_tone",
                    title="Daily Avg Tone (US)",
                    labels={"date": "Date", "avg_tone": "Avg Tone"},
                )
                fig_us_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_us_tone.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_us_tone, use_container_width=True)

        st.divider()

        # ---- Section: US State Map ----
        st.subheader("US State Map")

        us_metric = st.radio(
            "Color map by",
            ["Avg Sentiment", "Total Volume"],
            horizontal=True,
            key="us_map_metric",
        )

        if df_us_mapped.empty:
            st.info("No mappable US state data available.")
        else:
            if us_metric == "Avg Sentiment":
                fig_us_map = px.choropleth(
                    df_us_mapped,
                    locations="state_abbr",
                    locationmode="USA-states",
                    color="avg_tone",
                    hover_name="state_abbr",
                    hover_data={"article_count": True, "avg_tone": ":.2f"},
                    color_continuous_scale=SENTIMENT_COLOR_SCALE,
                    range_color=[-5, 5],
                    scope="usa",
                    title="Average Sentiment by US State",
                )
            else:
                fig_us_map = px.choropleth(
                    df_us_mapped,
                    locations="state_abbr",
                    locationmode="USA-states",
                    color="article_count",
                    hover_name="state_abbr",
                    hover_data={"article_count": True, "avg_tone": ":.2f"},
                    color_continuous_scale="Blues",
                    scope="usa",
                    title="Article Volume by US State",
                )

            fig_us_map.update_layout(margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig_us_map, use_container_width=True)

        with st.expander("Raw US state data"):
            st.dataframe(
                df_us_state.sort_values("article_count", ascending=False),
                use_container_width=True,
            )


# ==================================================================
# TAB 3 — Super Bowl
# ==================================================================

with tab3:
    st.header("Super Bowl LX — Did Anthropic's Ad Shift AI Sentiment?")
    st.markdown(
        "Anthropic ran a major ad during **Super Bowl LX** on **February 9, 2026**. "
        "Use the controls below to adjust the comparison window and geography."
    )

    SUPERBOWL_DATE = date(2026, 2, 9)

    weeks = st.slider("Window (weeks)", 1, 4, 2, key="sb_weeks")
    geo_filter = st.radio("Geography", ["Worldwide", "US only"], horizontal=True, key="sb_geo")

    before_end = SUPERBOWL_DATE - timedelta(days=1)
    before_start = SUPERBOWL_DATE - timedelta(weeks=weeks)
    after_start = SUPERBOWL_DATE + timedelta(days=1)
    after_end = SUPERBOWL_DATE + timedelta(weeks=weeks)

    st.caption(
        f"Before: {before_start} to {before_end}  |  "
        f"Event: {SUPERBOWL_DATE}  |  "
        f"After: {after_start} to {after_end}"
    )

    if geo_filter == "US only":
        st.info(
            "Note: Before/After org-level comparison uses worldwide data — "
            "country-level filtering is not yet available at the org aggregation level. "
            "The timeseries chart below is filtered to US articles."
        )

    # Company selector
    st.subheader("Companies to compare")
    sb_selected_orgs = st.multiselect(
        "Foundation model companies",
        options=FOUNDATION_MODEL_ORGS,
        default=["anthropic", "openai", "google"],
        format_func=lambda x: x.replace("_", " ").title(),
        key="sb_orgs",
    )

    if not sb_selected_orgs:
        st.warning("Select at least one company to compare.")
    else:
        df_before, err_before = fetch_sentiment_by_org(
            before_start.isoformat(), before_end.isoformat(), sb_selected_orgs
        )
        if err_before:
            st.warning(f"Error loading before-period data: {err_before}")

        df_after, err_after = fetch_sentiment_by_org(
            after_start.isoformat(), after_end.isoformat(), sb_selected_orgs
        )
        if err_after:
            st.warning(f"Error loading after-period data: {err_after}")

        if df_before.empty and df_after.empty:
            st.info("No data found for the selected companies and date windows.")
        else:
            df_before = df_before.copy()
            df_after = df_after.copy()
            df_before["period"] = "Before"
            df_after["period"] = "After"
            df_combined = pd.concat([df_before, df_after], ignore_index=True)
            df_combined["org_name"] = df_combined["org_name"].str.replace("_", " ").str.title()

            # Row 1: before/after bar charts
            col_left, col_right = st.columns(2)

            with col_left:
                st.subheader("Avg Tone Before vs After")
                fig_sb_tone = px.bar(
                    df_combined,
                    x="org_name",
                    y="avg_tone",
                    color="period",
                    barmode="group",
                    color_discrete_map={"Before": "#74add1", "After": "#f46d43"},
                    labels={
                        "org_name": "Company",
                        "avg_tone": "Avg Tone",
                        "period": "Period",
                    },
                )
                fig_sb_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_sb_tone.update_layout(margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_sb_tone, use_container_width=True)

            with col_right:
                st.subheader("Article Volume Before vs After")
                fig_sb_vol = px.bar(
                    df_combined,
                    x="org_name",
                    y="article_count",
                    color="period",
                    barmode="group",
                    color_discrete_map={"Before": "#74add1", "After": "#f46d43"},
                    labels={
                        "org_name": "Company",
                        "article_count": "Article Count",
                        "period": "Period",
                    },
                )
                fig_sb_vol.update_layout(margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_sb_vol, use_container_width=True)

            # Row 2: full-window timeseries
            st.subheader("Daily Sentiment Trend Across Full Window")

            if geo_filter == "US only":
                df_sb_ts, err_sb_ts = fetch_timeseries_per_org_by_country(
                    before_start.isoformat(),
                    after_end.isoformat(),
                    "US",
                    sb_selected_orgs,
                )
            else:
                df_sb_ts, err_sb_ts = fetch_timeseries_per_org(
                    before_start.isoformat(),
                    after_end.isoformat(),
                    sb_selected_orgs,
                )

            if err_sb_ts:
                st.warning(f"Error loading Super Bowl timeseries data: {err_sb_ts}")

            if df_sb_ts.empty:
                st.info("No timeseries data available for the selected window.")
            else:
                df_sb_ts["org_name_display"] = (
                    df_sb_ts["org_name"].str.replace("_", " ").str.title()
                )
                fig_sb_ts = px.line(
                    df_sb_ts,
                    x="date",
                    y="avg_tone",
                    color="org_name_display",
                    title="Daily Avg Tone by Company",
                    labels={
                        "date": "Date",
                        "avg_tone": "Avg Tone",
                        "org_name_display": "Company",
                    },
                )
                fig_sb_ts.add_vline(
                    x=pd.Timestamp(SUPERBOWL_DATE).timestamp() * 1000,
                    line_dash="dash",
                    line_color="red",
                    annotation_text="Super Bowl LX",
                    annotation_position="top right",
                )
                fig_sb_ts.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_sb_ts, use_container_width=True)

            with st.expander("Raw before/after data"):
                st.dataframe(df_combined, use_container_width=True)


# ==================================================================
# TAB 4 — Data Centers
# ==================================================================

with tab4:
    st.header("Data Center Sentiment")
    st.caption(f"Showing data from {start_date} to {end_date}")

    DC_FILTER = ["data_center"]

    df_dc_world, err_dc_world = fetch_sentiment_by_country(
        start_date.isoformat(), end_date.isoformat(), org_filter=DC_FILTER
    )
    if err_dc_world:
        st.warning(f"Error loading data center country data: {err_dc_world}")

    if df_dc_world.empty:
        st.info("No data center articles found for the selected date range. The backfill pipeline may still be running.")
    else:
        df_dc_world["country_code"] = df_dc_world["country_code"].str.strip()

        # ---- KPI row ----
        kpi1, kpi2, kpi3 = st.columns(3)
        kpi1.metric("Total Articles", f"{int(df_dc_world['article_count'].sum()):,}")
        kpi2.metric("Countries Covered", int(df_dc_world["country_code"].nunique()))
        kpi3.metric("Global Avg Tone", f"{df_dc_world['avg_tone'].mean():.2f}")

        st.divider()

        # ---- Section: Overall Trends ----
        st.subheader("Overall Trends")

        df_dc_ts, err_dc_ts = fetch_sentiment_timeseries(
            start_date.isoformat(), end_date.isoformat(), org_filter=DC_FILTER
        )
        if err_dc_ts:
            st.warning(f"Error loading data center timeseries: {err_dc_ts}")

        if not df_dc_ts.empty:
            col_left, col_right = st.columns(2)
            with col_left:
                fig_dc_vol = px.line(
                    df_dc_ts, x="date", y="article_count",
                    title="Daily Article Volume (Data Centers)",
                    labels={"date": "Date", "article_count": "Article Count"},
                )
                fig_dc_vol.update_layout(hovermode="x unified", margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_dc_vol, use_container_width=True)

            with col_right:
                fig_dc_tone = px.line(
                    df_dc_ts, x="date", y="avg_tone",
                    title="Daily Avg Tone (Data Centers)",
                    labels={"date": "Date", "avg_tone": "Avg Tone"},
                )
                fig_dc_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_dc_tone.update_layout(hovermode="x unified", margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_dc_tone, use_container_width=True)

        st.divider()

        # ---- Section: World Map ----
        st.subheader("World Map")

        dc_map_metric = st.radio(
            "Color map by",
            ["Avg Sentiment", "Total Volume"],
            horizontal=True,
            key="dc_map_metric",
        )

        df_dc_world["iso3"] = df_dc_world["country_code"].map(FIPS_TO_ISO3)
        df_dc_mapped = df_dc_world.dropna(subset=["iso3"])

        if not df_dc_mapped.empty:
            if dc_map_metric == "Avg Sentiment":
                fig_dc_map = px.choropleth(
                    df_dc_mapped,
                    locations="iso3", locationmode="ISO-3",
                    color="avg_tone", hover_name="country_code",
                    hover_data={"article_count": True, "avg_tone": ":.2f", "iso3": False},
                    color_continuous_scale=SENTIMENT_COLOR_SCALE,
                    range_color=[-5, 5],
                    title="Data Center Sentiment by Country",
                )
            else:
                fig_dc_map = px.choropleth(
                    df_dc_mapped,
                    locations="iso3", locationmode="ISO-3",
                    color="article_count", hover_name="country_code",
                    hover_data={"article_count": True, "avg_tone": ":.2f", "iso3": False},
                    color_continuous_scale="Blues",
                    title="Data Center Article Volume by Country",
                )
            fig_dc_map.update_layout(
                geo=dict(showframe=False, showcoastlines=True, projection_type="natural earth"),
                margin=dict(l=0, r=0, t=40, b=0),
            )
            st.plotly_chart(fig_dc_map, use_container_width=True)

        st.divider()

        # ---- Section: US State Map ----
        st.subheader("US State Map")

        df_dc_us, err_dc_us = fetch_sentiment_by_us_state(
            start_date.isoformat(), end_date.isoformat(), org_filter=DC_FILTER
        )
        if err_dc_us:
            st.warning(f"Error loading data center US state data: {err_dc_us}")

        if df_dc_us.empty:
            st.info("No US state-level data center data available.")
        else:
            df_dc_us = df_dc_us[df_dc_us["adm1_code"] != "US"].copy()
            df_dc_us["state_abbr"] = df_dc_us["adm1_code"].str[-2:].str.upper()
            df_dc_us_mapped = df_dc_us.dropna(subset=["state_abbr"])

            dc_us_metric = st.radio(
                "Color map by",
                ["Avg Sentiment", "Total Volume"],
                horizontal=True,
                key="dc_us_metric",
            )

            if not df_dc_us_mapped.empty:
                if dc_us_metric == "Avg Sentiment":
                    fig_dc_us_map = px.choropleth(
                        df_dc_us_mapped,
                        locations="state_abbr", locationmode="USA-states",
                        color="avg_tone", hover_name="state_abbr",
                        hover_data={"article_count": True, "avg_tone": ":.2f"},
                        color_continuous_scale=SENTIMENT_COLOR_SCALE,
                        range_color=[-5, 5], scope="usa",
                        title="Data Center Sentiment by US State",
                    )
                else:
                    fig_dc_us_map = px.choropleth(
                        df_dc_us_mapped,
                        locations="state_abbr", locationmode="USA-states",
                        color="article_count", hover_name="state_abbr",
                        hover_data={"article_count": True, "avg_tone": ":.2f"},
                        color_continuous_scale="Blues", scope="usa",
                        title="Data Center Article Volume by US State",
                    )
                fig_dc_us_map.update_layout(margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_dc_us_map, use_container_width=True)


# ==================================================================
# TAB 5 — Company Comparison
# ==================================================================

with tab5:
    st.header("Company Comparison")
    st.caption(f"Showing data from {start_date} to {end_date}")

    comp_selected_orgs = st.multiselect(
        "Companies",
        options=ALL_ORGS,
        default=["anthropic", "openai", "google"],
        format_func=lambda x: x.replace("_", " ").title(),
        key="comp_orgs",
    )

    if not comp_selected_orgs:
        st.info("Select at least one company to see comparison charts.")
    else:
        # ---- Section: Summary Table ----
        st.subheader("Average Sentiment Summary")

        df_org_summary, err_org_summary = fetch_sentiment_by_org(
            start_date.isoformat(), end_date.isoformat(), comp_selected_orgs
        )
        df_us_summary, err_us_summary = fetch_timeseries_per_org_by_country(
            start_date.isoformat(), end_date.isoformat(), "US", comp_selected_orgs
        )

        if err_org_summary:
            st.warning(f"Error loading worldwide summary: {err_org_summary}")
        if err_us_summary:
            st.warning(f"Error loading US summary: {err_us_summary}")

        if not df_org_summary.empty:
            summary = df_org_summary[["org_name", "avg_tone", "article_count"]].copy()
            summary.columns = ["org_name", "Worldwide Avg Tone", "Worldwide Articles"]

            if not df_us_summary.empty:
                us_agg = (
                    df_us_summary.groupby("org_name")
                    .agg(us_avg_tone=("avg_tone", "mean"), us_articles=("article_count", "sum"))
                    .reset_index()
                )
                summary = summary.merge(us_agg, on="org_name", how="left")
                summary.rename(columns={"us_avg_tone": "US Avg Tone", "us_articles": "US Articles"}, inplace=True)
            else:
                summary["US Avg Tone"] = None
                summary["US Articles"] = None

            summary["Company"] = summary["org_name"].str.replace("_", " ").str.title()
            summary = summary.drop(columns=["org_name"]).set_index("Company")
            summary["Worldwide Avg Tone"] = summary["Worldwide Avg Tone"].round(2)
            summary["Worldwide Articles"] = summary["Worldwide Articles"].astype(int)
            if "US Avg Tone" in summary.columns:
                summary["US Avg Tone"] = summary["US Avg Tone"].round(2)
                summary["US Articles"] = summary["US Articles"].fillna(0).astype(int)
            summary = summary.sort_values("Worldwide Avg Tone", ascending=False)

            st.dataframe(summary, use_container_width=True)

        st.divider()

        # ---- Section: Worldwide by Company ----
        st.subheader("Worldwide")

        df_ts_org, err_ts_org = fetch_timeseries_per_org(
            start_date.isoformat(), end_date.isoformat(), comp_selected_orgs
        )
        if err_ts_org:
            st.warning(f"Error loading per-company timeseries data: {err_ts_org}")

        if df_ts_org.empty:
            st.info("No per-company timeseries data available for the selected range and companies.")
        else:
            df_ts_org["org_name_display"] = df_ts_org["org_name"].str.replace("_", " ").str.title()

            col_left, col_right = st.columns(2)

            with col_left:
                fig_org_vol = px.line(
                    df_ts_org,
                    x="date",
                    y="article_count",
                    color="org_name_display",
                    title="Daily Volume by Company",
                    labels={
                        "date": "Date",
                        "article_count": "Article Count",
                        "org_name_display": "Company",
                    },
                )
                fig_org_vol.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_org_vol, use_container_width=True)

            with col_right:
                fig_org_tone = px.line(
                    df_ts_org,
                    x="date",
                    y="avg_tone",
                    color="org_name_display",
                    title="Daily Sentiment by Company",
                    labels={
                        "date": "Date",
                        "avg_tone": "Avg Tone",
                        "org_name_display": "Company",
                    },
                )
                fig_org_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_org_tone.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_org_tone, use_container_width=True)

        st.divider()

        # ---- Section: US by Company ----
        st.subheader("US")

        df_us_org_ts, err_us_org_ts = fetch_timeseries_per_org_by_country(
            start_date.isoformat(), end_date.isoformat(), "US", comp_selected_orgs
        )
        if err_us_org_ts:
            st.warning(f"Error loading US per-company timeseries data: {err_us_org_ts}")

        if df_us_org_ts.empty:
            st.info("No per-company US timeseries data available for the selected range and companies.")
        else:
            df_us_org_ts["org_name_display"] = (
                df_us_org_ts["org_name"].str.replace("_", " ").str.title()
            )

            col_left, col_right = st.columns(2)

            with col_left:
                fig_us_org_vol = px.line(
                    df_us_org_ts,
                    x="date",
                    y="article_count",
                    color="org_name_display",
                    title="Daily Volume by Company (US)",
                    labels={
                        "date": "Date",
                        "article_count": "Article Count",
                        "org_name_display": "Company",
                    },
                )
                fig_us_org_vol.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_us_org_vol, use_container_width=True)

            with col_right:
                fig_us_org_tone = px.line(
                    df_us_org_ts,
                    x="date",
                    y="avg_tone",
                    color="org_name_display",
                    title="Daily Sentiment by Company (US)",
                    labels={
                        "date": "Date",
                        "avg_tone": "Avg Tone",
                        "org_name_display": "Company",
                    },
                )
                fig_us_org_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_us_org_tone.update_layout(
                    hovermode="x unified",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_us_org_tone, use_container_width=True)


# ==================================================================
# TAB 6 — Ask the Data (RAG Chatbot)
# ==================================================================

with tab6:
    import json
    from groq import Groq

    st.header("Ask the Data")
    st.caption("Ask natural language questions about AI sentiment trends.")

    @st.cache_resource
    def get_groq_client():
        return Groq(api_key=_get_setting("GROQ_API_KEY"))

    # ------------------------------------------------------------------
    # Tool definitions
    # ------------------------------------------------------------------

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
                        "country_code": {
                            "type": "string",
                            "description": "Optional 2-letter FIPS country code (e.g. US, UK, CH)",
                        },
                        "org_filter": {
                            "type": "string",
                            "description": "Optional single org name to filter by (e.g. anthropic)",
                        },
                        "sort_by": {
                            "type": "string",
                            "enum": ["recent", "most_negative", "most_positive"],
                            "description": "recent=newest first, most_negative/most_positive for tone analysis",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max headlines to return (default 60, max 100)",
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
                "name": "semantic_search_articles",
                "description": (
                    "Find articles semantically similar to a topic or question using vector search. "
                    "Best for open-ended questions: 'why', 'what is driving', 'summarize', "
                    "'what are people saying about X'. Returns the most relevant headlines with tone scores."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The topic or question to search for semantically similar articles",
                        },
                        "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                        "end_date":   {"type": "string", "description": "End date YYYY-MM-DD"},
                        "country_code": {
                            "type": "string",
                            "description": "Optional 2-letter FIPS country code to restrict search (e.g. US)",
                        },
                        "org_filter": {
                            "type": "string",
                            "description": "Optional org name to restrict search (e.g. anthropic, openai)",
                        },
                        "match_count": {
                            "type": "integer",
                            "description": "Number of articles to return (default 30, max 60)",
                        },
                    },
                    "required": ["query", "start_date", "end_date"],
                },
            },
        },
    ]

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    def _execute_tool(tool_name: str, args: dict) -> str:
        client = get_supabase_client()

        if tool_name == "get_sentiment_by_country":
            resp = client.rpc("get_sentiment_by_country", {
                "start_date": args["start_date"],
                "end_date":   args["end_date"],
            }).execute()
            if not resp.data:
                return "No country data found for this period."
            df = pd.DataFrame(resp.data).sort_values("article_count", ascending=False)
            df["avg_tone"] = df["avg_tone"].round(2)
            return f"Sentiment by country ({len(df)} countries):\n{df.to_string(index=False)}"

        if tool_name == "get_sentiment_timeseries":
            params = {"start_date": args["start_date"], "end_date": args["end_date"]}
            if args.get("org_filter"):
                params["org_filter"] = args["org_filter"]
            resp = client.rpc("get_sentiment_timeseries", params).execute()
            if not resp.data:
                return "No timeseries data found for this period."
            df = pd.DataFrame(resp.data)
            df["avg_tone"] = df["avg_tone"].round(2)
            return f"Daily sentiment ({len(df)} days):\n{df.to_string(index=False)}"

        if tool_name == "get_sentiment_by_org":
            resp = client.rpc("get_sentiment_by_org", {
                "start_date": args["start_date"],
                "end_date":   args["end_date"],
                "org_list":   args["org_list"],
            }).execute()
            if not resp.data:
                return "No organization data found for this period."
            df = pd.DataFrame(resp.data).sort_values("avg_tone")
            df["avg_tone"] = df["avg_tone"].round(2)
            return f"Sentiment by company:\n{df.to_string(index=False)}"

        if tool_name == "get_recent_headlines":
            limit = min(args.get("limit", 60), 100)
            sort_by = args.get("sort_by", "recent")

            q = client.table("articles").select(
                "title, source_name, published_date, avg_tone, mentioned_country_code, organizations"
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
                return "No headlines found for this period."

            df = pd.DataFrame(resp.data)
            df = df[~df["title"].str.startswith("http", na=False)]
            if df.empty:
                return "No page titles available for this period (only URLs stored)."

            lines = []
            for _, row in df.iterrows():
                tone = f"{row['avg_tone']:.1f}" if pd.notna(row.get("avg_tone")) else "N/A"
                lines.append(f"[{row['published_date']}] (tone:{tone}) {row['title']}")
            return f"Headlines ({len(lines)}):\n" + "\n".join(lines)

        if tool_name == "get_sentiment_by_us_state":
            resp = client.rpc("get_sentiment_by_us_state", {
                "start_date": args["start_date"],
                "end_date":   args["end_date"],
            }).execute()
            if not resp.data:
                return "No US state data found for this period."
            df = pd.DataFrame(resp.data).sort_values("article_count", ascending=False)
            df["avg_tone"] = df["avg_tone"].round(2)
            return f"US state sentiment ({len(df)} states):\n{df.to_string(index=False)}"

        if tool_name == "semantic_search_articles":
            from pipeline.embed import embed_texts
            query_vec = embed_texts([args["query"]])[0]
            params = {
                "query_embedding": query_vec,
                "match_count": min(args.get("match_count", 30), 60),
                "filter_start_date": args["start_date"],
                "filter_end_date": args["end_date"],
            }
            if args.get("country_code"):
                params["filter_country"] = args["country_code"].upper().strip()
            if args.get("org_filter"):
                params["filter_org"] = args["org_filter"]
            resp = client.rpc("match_articles", params).execute()
            if not resp.data:
                return "No semantically similar articles found. Embeddings may still be backfilling."
            df = pd.DataFrame(resp.data)
            lines = []
            for _, row in df.iterrows():
                tone = f"{row['avg_tone']:.1f}" if pd.notna(row.get("avg_tone")) else "N/A"
                sim  = f"{row['similarity']:.2f}" if pd.notna(row.get("similarity")) else ""
                lines.append(f"[{row['published_date']}] (tone:{tone} sim:{sim}) {row['title']}")
            return f"Semantically relevant articles ({len(lines)}):\n" + "\n".join(lines)

        return f"Unknown tool: {tool_name}"

    # ------------------------------------------------------------------
    # System prompt
    # ------------------------------------------------------------------

    _SYSTEM_PROMPT = f"""You are an AI sentiment analyst. You have access to a database of global \
news articles about AI collected daily from GDELT (a real-time global news index). Each article \
has a sentiment tone score (avg_tone): positive values = favorable coverage, negative = critical \
or alarming coverage, near zero = neutral. Scores typically range from -10 to +10; above +2 is \
noticeably positive, below -2 is noticeably negative.

Today is {date.today().isoformat()}. Data covers the last 12 months.

Available companies/tags: anthropic, openai, google, microsoft, meta, nvidia, amazon, apple, \
xai, mistral, deepseek, anduril, palantir, department_of_defense, data_center.

Rules:
- Always call tools to get real data before answering — never guess numbers.
- For "why", "what's driving", or "summarize" questions, prefer semantic_search_articles — it finds topically relevant articles even when exact keywords differ.
- For trend questions, call get_sentiment_timeseries.
- For date/country/org-filtered headline lists, use get_recent_headlines.
- Default to last 30 days when the user doesn't specify a date range.
- Be concise. Lead with the key finding, then supporting numbers.
- When citing tone, always include the numeric value."""

    # ------------------------------------------------------------------
    # Chatbot runner
    # ------------------------------------------------------------------

    def _run_chatbot(user_message: str) -> str:
        from groq import RateLimitError
        import re
        groq_client = get_groq_client()

        base_messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
        base_messages.extend(st.session_state.chat_messages)
        base_messages.append({"role": "user", "content": user_message})

        def _call_model(model: str) -> str:
            msgs = base_messages.copy()
            for _ in range(6):
                response = groq_client.chat.completions.create(
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
                return _call_model(model)
            except RateLimitError:
                continue

        return "Both Groq models are rate limited. Please try again in a few minutes."

    # ------------------------------------------------------------------
    # Chat UI
    # ------------------------------------------------------------------

    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []

    # Suggested questions (shown only when chat is empty)
    if not st.session_state.chat_messages:
        st.markdown("**Try asking:**")
        suggestions = [
            "What is the sentiment toward AI in the US this month?",
            "Which countries are most negative about AI recently?",
            "Why did AI sentiment drop last week?",
            "Compare Anthropic vs OpenAI sentiment in the last 30 days",
            "Summarize the main AI narrative in global news over the last 30 days",
        ]
        cols = st.columns(1)
        for s in suggestions:
            if st.button(s, key=f"suggest_{hash(s)}"):
                with st.chat_message("user"):
                    st.write(s)
                with st.chat_message("assistant"):
                    with st.spinner("Querying data..."):
                        reply = _run_chatbot(s)
                    st.write(reply)
                st.session_state.chat_messages.append({"role": "user", "content": s})
                st.session_state.chat_messages.append({"role": "assistant", "content": reply})
                st.rerun()

    # Render history
    for m in st.session_state.chat_messages:
        if m["role"] in ("user", "assistant"):
            with st.chat_message(m["role"]):
                st.write(m["content"])

    # Input
    if prompt := st.chat_input("Ask about AI sentiment trends..."):
        with st.chat_message("user"):
            st.write(prompt)
        with st.chat_message("assistant"):
            with st.spinner("Querying data..."):
                reply = _run_chatbot(prompt)
            st.write(reply)
        st.session_state.chat_messages.append({"role": "user", "content": prompt})
        st.session_state.chat_messages.append({"role": "assistant", "content": reply})

        # Keep last 20 messages to avoid context overflow
        if len(st.session_state.chat_messages) > 20:
            st.session_state.chat_messages = st.session_state.chat_messages[-20:]

    if st.session_state.chat_messages:
        if st.button("Clear chat", key="clear_chat"):
            st.session_state.chat_messages = []
            st.rerun()
