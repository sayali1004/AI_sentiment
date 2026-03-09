"""AI Sentiment Dashboard — Streamlit App."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import date, timedelta
from supabase import create_client

st.set_page_config(page_title="AI Sentiment Dashboard", layout="wide")


def _get_setting(key: str) -> str:
    """Read from Streamlit secrets (cloud) or env vars (local)."""
    if hasattr(st, "secrets") and key in st.secrets:
        return st.secrets[key]
    from config.settings import _get
    return _get(key)


@st.cache_resource
def get_supabase_client():
    url = _get_setting("SUPABASE_URL")
    key = _get_setting("SUPABASE_ANON_KEY")
    return create_client(url, key)


@st.cache_data(ttl=3600)
def fetch_sentiment_by_country(start_date: str, end_date: str) -> pd.DataFrame:
    client = get_supabase_client()
    response = client.rpc(
        "get_sentiment_by_country",
        {"start_date": start_date, "end_date": end_date},
    ).execute()
    if response.data:
        return pd.DataFrame(response.data)
    return pd.DataFrame(columns=["country_code", "avg_tone", "article_count"])


@st.cache_data(ttl=3600)
def fetch_sentiment_by_us_state(start_date: str, end_date: str) -> pd.DataFrame:
    client = get_supabase_client()
    response = client.rpc(
        "get_sentiment_by_us_state",
        {"start_date": start_date, "end_date": end_date},
    ).execute()
    if response.data:
        return pd.DataFrame(response.data)
    return pd.DataFrame(columns=["adm1_code", "avg_tone", "article_count"])


@st.cache_data(ttl=3600)
def fetch_sentiment_timeseries(start_date: str, end_date: str, org_filter: list[str] | None = None) -> pd.DataFrame:
    client = get_supabase_client()
    params = {"start_date": start_date, "end_date": end_date, "org_filter": org_filter}
    response = client.rpc("get_sentiment_timeseries", params).execute()
    if response.data:
        df = pd.DataFrame(response.data)
        df["date"] = pd.to_datetime(df["date"])
        return df
    return pd.DataFrame(columns=["date", "avg_tone", "article_count"])


@st.cache_data(ttl=3600)
def fetch_sentiment_by_org(start_date: str, end_date: str, org_list: list[str]) -> pd.DataFrame:
    client = get_supabase_client()
    response = client.rpc(
        "get_sentiment_by_org",
        {"start_date": start_date, "end_date": end_date, "org_list": org_list},
    ).execute()
    if response.data:
        return pd.DataFrame(response.data)
    return pd.DataFrame(columns=["org_name", "avg_tone", "article_count"])


# ------------------------------------------------------------------
# GDELT FIPS 10-4 → ISO-3166-1 alpha-3 mapping (for Plotly)
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
# GDELT format: "US" + 2-digit FIPS state code (e.g. "US06" = California)
# Plotly USA-states uses postal codes (e.g. "CA")
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

ALL_ORGS = ["anthropic", "openai", "google", "meta", "xai", "anduril", "palantir"]
FOUNDATION_MODEL_ORGS = ["anthropic", "openai", "google", "meta", "xai"]
WEAPONS_ORGS = ["anduril", "palantir"]

PRESET_EVENTS = {
    "Superbowl (Feb 9, 2026)": {
        "event_date": date(2026, 2, 9),
        "before_start": date(2026, 1, 26),
        "before_end": date(2026, 2, 8),
        "after_start": date(2026, 2, 10),
        "after_end": date(2026, 2, 23),
        "description": "Did Anthropic's Super Bowl ad shift AI sentiment?",
    },
    "Anthropic vs DOW (custom)": {
        "event_date": None,  # user-configurable
        "before_start": None,
        "before_end": None,
        "after_start": None,
        "after_end": None,
        "description": "Did the Pentagon dispute shift AI sentiment among weapons vs foundation model companies?",
    },
}

# ------------------------------------------------------------------
# Sidebar
# ------------------------------------------------------------------
st.sidebar.title("Filters")
today = date.today()
default_start = today - timedelta(days=30)
min_date = today - timedelta(days=365)

start_date = st.sidebar.date_input("Start date", value=default_start, min_value=min_date, max_value=today)
end_date = st.sidebar.date_input("End date", value=today, min_value=min_date, max_value=today)

if start_date > end_date:
    st.sidebar.error("Start date must be before end date.")
    st.stop()

# ------------------------------------------------------------------
# Tabs
# ------------------------------------------------------------------
tab1, tab2, tab3, tab4 = st.tabs([
    "🌍 World Overview",
    "🇺🇸 USA Deep Dive",
    "📈 Trends Over Time",
    "🔍 Event Analysis",
])

# ==================================================================
# TAB 1: World Overview
# ==================================================================
with tab1:
    st.header("Global AI Sentiment & Volume")
    st.caption(f"Showing data from {start_date} to {end_date}")

    df_world = fetch_sentiment_by_country(start_date.isoformat(), end_date.isoformat())

    if df_world.empty:
        st.info("No data available for the selected date range.")
    else:
        col1, col2, col3 = st.columns(3)
        col1.metric("Countries", len(df_world))
        col2.metric("Total Articles", int(df_world["article_count"].sum()))
        col3.metric("Global Avg Tone", f"{df_world['avg_tone'].mean():.2f}")

        df_world["iso3"] = df_world["country_code"].map(FIPS_TO_ISO3)
        df_mapped = df_world.dropna(subset=["iso3"])

        map_metric = st.radio("Color map by", ["Sentiment (avg tone)", "Article volume"], horizontal=True)

        if map_metric == "Sentiment (avg tone)":
            fig = px.choropleth(
                df_mapped,
                locations="iso3",
                locationmode="ISO-3",
                color="avg_tone",
                hover_name="country_code",
                hover_data={"article_count": True, "avg_tone": ":.2f", "iso3": False},
                color_continuous_scale=SENTIMENT_COLOR_SCALE,
                range_color=[-5, 5],
                title="Average Sentiment by Country",
            )
        else:
            fig = px.choropleth(
                df_mapped,
                locations="iso3",
                locationmode="ISO-3",
                color="article_count",
                hover_name="country_code",
                hover_data={"article_count": True, "avg_tone": ":.2f", "iso3": False},
                color_continuous_scale="Blues",
                title="Article Volume by Country",
            )

        fig.update_layout(
            geo=dict(showframe=False, showcoastlines=True, projection_type="natural earth"),
            margin=dict(l=0, r=0, t=40, b=0),
        )
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("Raw data"):
            st.dataframe(df_world.sort_values("article_count", ascending=False), use_container_width=True)


# ==================================================================
# TAB 2: USA Deep Dive
# ==================================================================
with tab2:
    st.header("US State-Level AI Sentiment & Volume")
    st.caption(f"Showing data from {start_date} to {end_date}")

    df_us = fetch_sentiment_by_us_state(start_date.isoformat(), end_date.isoformat())

    if df_us.empty:
        st.info("No US state data available for the selected date range.")
    else:
        df_us["state_abbr"] = df_us["adm1_code"].map(GDELT_ADM1_TO_STATE)
        df_us_mapped = df_us.dropna(subset=["state_abbr"])

        col1, col2, col3 = st.columns(3)
        col1.metric("States", len(df_us_mapped))
        col2.metric("Total Articles", int(df_us["article_count"].sum()))
        col3.metric("US Avg Tone", f"{df_us['avg_tone'].mean():.2f}")

        us_metric = st.radio("Color map by", ["Sentiment (avg tone)", "Article volume"], horizontal=True, key="us_metric")

        if us_metric == "Sentiment (avg tone)":
            fig_us = px.choropleth(
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
            fig_us = px.choropleth(
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

        fig_us.update_layout(margin=dict(l=0, r=0, t=40, b=0))
        st.plotly_chart(fig_us, use_container_width=True)

        with st.expander("Raw data"):
            st.dataframe(df_us.sort_values("article_count", ascending=False), use_container_width=True)


# ==================================================================
# TAB 3: Trends Over Time
# ==================================================================
with tab3:
    st.header("AI Sentiment Trends Over Time")

    org_options = ["(All articles)"] + ALL_ORGS
    selected_orgs = st.multiselect(
        "Filter by company (optional)",
        options=ALL_ORGS,
        default=[],
        format_func=lambda x: x.title(),
        help="Leave empty to show all AI articles regardless of organization mention.",
    )

    org_filter_param = selected_orgs if selected_orgs else None
    df_ts = fetch_sentiment_timeseries(start_date.isoformat(), end_date.isoformat(), org_filter_param)

    if df_ts.empty:
        st.info("No timeseries data available for the selected filters.")
    else:
        fig_ts = go.Figure()

        fig_ts.add_trace(go.Scatter(
            x=df_ts["date"],
            y=df_ts["avg_tone"],
            name="Avg Tone",
            line=dict(color="#1a9850", width=2),
            yaxis="y1",
        ))

        fig_ts.add_trace(go.Bar(
            x=df_ts["date"],
            y=df_ts["article_count"],
            name="Article Volume",
            marker_color="rgba(100, 150, 220, 0.4)",
            yaxis="y2",
        ))

        fig_ts.update_layout(
            title="Daily AI Sentiment & Volume" + (f" — {', '.join(o.title() for o in selected_orgs)}" if selected_orgs else ""),
            xaxis=dict(title="Date"),
            yaxis=dict(title="Avg Tone", side="left", showgrid=False),
            yaxis2=dict(title="Article Count", side="right", overlaying="y", showgrid=False),
            legend=dict(x=0.01, y=0.99),
            hovermode="x unified",
            margin=dict(l=0, r=0, t=50, b=0),
        )
        st.plotly_chart(fig_ts, use_container_width=True)

        with st.expander("Raw data"):
            st.dataframe(df_ts, use_container_width=True)


# ==================================================================
# TAB 4: Event Analysis
# ==================================================================
with tab4:
    st.header("Event Analysis: Before vs After")

    # Event selector
    event_name = st.selectbox("Select event", list(PRESET_EVENTS.keys()))
    event_cfg = PRESET_EVENTS[event_name]
    st.caption(event_cfg["description"])

    if event_name == "Anthropic vs DOW (custom)":
        col_a, col_b = st.columns(2)
        with col_a:
            st.subheader("Before window")
            ev_before_start = st.date_input("Before: start", value=date(2026, 1, 1), key="ev_bs")
            ev_before_end = st.date_input("Before: end", value=date(2026, 1, 31), key="ev_be")
        with col_b:
            st.subheader("After window")
            ev_after_start = st.date_input("After: start", value=date(2026, 2, 1), key="ev_as")
            ev_after_end = st.date_input("After: end", value=date(2026, 2, 28), key="ev_ae")
    else:
        ev_before_start = event_cfg["before_start"]
        ev_before_end = event_cfg["before_end"]
        ev_after_start = event_cfg["after_start"]
        ev_after_end = event_cfg["after_end"]
        st.info(
            f"Before window: {ev_before_start} – {ev_before_end}  |  "
            f"After window: {ev_after_start} – {ev_after_end}"
        )

    # Company / group selector
    st.subheader("Companies to compare")
    col_f, col_w = st.columns(2)
    with col_f:
        selected_foundation = st.multiselect(
            "Foundation model companies",
            options=FOUNDATION_MODEL_ORGS,
            default=["anthropic", "openai", "google"],
            format_func=str.title,
        )
    with col_w:
        selected_weapons = st.multiselect(
            "Autonomous weapons companies",
            options=WEAPONS_ORGS,
            default=WEAPONS_ORGS,
            format_func=str.title,
        )

    org_list = selected_foundation + selected_weapons

    if not org_list:
        st.warning("Select at least one company to compare.")
    elif ev_before_start and ev_before_end and ev_after_start and ev_after_end:
        df_before = fetch_sentiment_by_org(ev_before_start.isoformat(), ev_before_end.isoformat(), org_list)
        df_after = fetch_sentiment_by_org(ev_after_start.isoformat(), ev_after_end.isoformat(), org_list)

        if df_before.empty and df_after.empty:
            st.info("No data found for the selected companies and date windows.")
        else:
            df_before["period"] = "Before"
            df_after["period"] = "After"
            df_combined = pd.concat([df_before, df_after], ignore_index=True)
            df_combined["org_name"] = df_combined["org_name"].str.title()

            col_left, col_right = st.columns(2)

            with col_left:
                st.subheader("Average Tone Before vs After")
                fig_tone = px.bar(
                    df_combined,
                    x="org_name",
                    y="avg_tone",
                    color="period",
                    barmode="group",
                    color_discrete_map={"Before": "#74add1", "After": "#f46d43"},
                    labels={"org_name": "Company", "avg_tone": "Avg Tone", "period": "Period"},
                )
                fig_tone.add_hline(y=0, line_dash="dot", line_color="gray")
                fig_tone.update_layout(margin=dict(l=0, r=0, t=10, b=0))
                st.plotly_chart(fig_tone, use_container_width=True)

            with col_right:
                st.subheader("Article Volume Before vs After")
                fig_vol = px.bar(
                    df_combined,
                    x="org_name",
                    y="article_count",
                    color="period",
                    barmode="group",
                    color_discrete_map={"Before": "#74add1", "After": "#f46d43"},
                    labels={"org_name": "Company", "article_count": "Article Count", "period": "Period"},
                )
                fig_vol.update_layout(margin=dict(l=0, r=0, t=10, b=0))
                st.plotly_chart(fig_vol, use_container_width=True)

            with st.expander("Raw data"):
                st.dataframe(df_combined, use_container_width=True)
