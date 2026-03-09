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
    # Bug 2 fix: only include org_filter when it has values so SQL default NULL applies
    params = {"start_date": start_date, "end_date": end_date}
    if org_filter:
        params["org_filter"] = org_filter
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


def fetch_timeseries_per_org(start_date: str, end_date: str, orgs: list[str]) -> pd.DataFrame:
    """Fetch daily timeseries for each org separately and combine."""
    frames = []
    for org in orgs:
        df = fetch_sentiment_timeseries(start_date, end_date, [org])
        if not df.empty:
            df["org"] = org.replace("_", " ").title()
            frames.append(df)
    if frames:
        return pd.concat(frames, ignore_index=True)
    return pd.DataFrame(columns=["date", "avg_tone", "article_count", "org"])


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

ALL_ORGS = ["anthropic", "openai", "google", "meta", "xai", "anduril", "palantir", "department_of_defense"]
FOUNDATION_MODEL_ORGS = ["anthropic", "openai", "google", "meta", "xai"]
WEAPONS_ORGS = ["anduril", "palantir"]
GOVERNMENT_ORGS = ["department_of_defense"]


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
# Shared event tab renderer
# ------------------------------------------------------------------
def render_event_tab(
    event_date: date,
    default_orgs: list[str],
    org_options: dict,
    window_key: str,
    event_date_configurable: bool = False,
    event_date_key: str = None,
    event_date_default: date = None,
):
    """Render the 3-panel before/after event analysis."""
    if event_date_configurable:
        event_date = st.date_input(
            "Event date",
            value=event_date_default or event_date,
            key=event_date_key,
        )

    weeks = st.slider("Window size (weeks)", 1, 4, 2, key=window_key)

    before_end = event_date - timedelta(days=1)
    before_start = event_date - timedelta(weeks=weeks)
    after_start = event_date + timedelta(days=1)
    after_end = event_date + timedelta(weeks=weeks)

    st.caption(
        f"Before: {before_start} to {before_end}  |  "
        f"Event: {event_date}  |  "
        f"After: {after_start} to {after_end}"
    )

    # Company selector
    st.subheader("Companies to compare")
    selected_orgs = []
    cols = st.columns(len(org_options))
    for col, (group_label, group_orgs) in zip(cols, org_options.items()):
        with col:
            sel = st.multiselect(
                group_label,
                options=group_orgs,
                default=[o for o in group_orgs if o in default_orgs],
                format_func=lambda x: x.replace("_", " ").title(),
                key=f"{window_key}_{group_label}",
            )
            selected_orgs.extend(sel)

    if not selected_orgs:
        st.warning("Select at least one company to compare.")
        return

    df_before = fetch_sentiment_by_org(before_start.isoformat(), before_end.isoformat(), selected_orgs)
    df_after = fetch_sentiment_by_org(after_start.isoformat(), after_end.isoformat(), selected_orgs)

    if df_before.empty and df_after.empty:
        st.info("No data found for the selected companies and date windows.")
        return

    df_before["period"] = "Before"
    df_after["period"] = "After"
    df_combined = pd.concat([df_before, df_after], ignore_index=True)
    df_combined["org_name"] = df_combined["org_name"].str.replace("_", " ").str.title()

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

    st.subheader("Daily Sentiment Trend Across Full Window")
    df_ts = fetch_timeseries_per_org(before_start.isoformat(), after_end.isoformat(), selected_orgs)

    if df_ts.empty:
        st.info("No timeseries data available.")
    else:
        fig_ts = px.line(
            df_ts,
            x="date",
            y="avg_tone",
            color="org",
            labels={"date": "Date", "avg_tone": "Avg Tone", "org": "Company"},
            title="Daily Avg Tone by Company",
        )
        fig_ts.add_vline(
            x=event_date.isoformat(),
            line_dash="dash",
            line_color="red",
            annotation_text="Event",
            annotation_position="top right",
        )
        fig_ts.update_layout(margin=dict(l=0, r=0, t=40, b=0), hovermode="x unified")
        st.plotly_chart(fig_ts, use_container_width=True)

    with st.expander("Raw data"):
        st.dataframe(df_combined, use_container_width=True)


# ------------------------------------------------------------------
# Tabs
# ------------------------------------------------------------------
tab1, tab2, tab3, tab4 = st.tabs([
    "🌍 Global AI Sentiment Overview",
    "🏈 Super Bowl — Did Anthropic's Ad Shift Sentiment?",
    "⚔️ DOD Dispute — Did the Pentagon Fight Shift Sentiment?",
    "🇺🇸 USA Deep Dive",
])


# ==================================================================
# TAB 1: Global AI Sentiment Overview
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

        # Bug 1 fix: strip CHAR(2) trailing whitespace before dict lookup
        df_world["country_code"] = df_world["country_code"].str.strip()
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
# TAB 2: Super Bowl
# ==================================================================
with tab2:
    st.header("Super Bowl LX — Did Anthropic's Ad Shift AI Sentiment?")
    st.markdown(
        "Anthropic ran a major ad during Super Bowl LX on **February 9, 2026**. "
        "Use the window slider to adjust how many weeks before/after to compare."
    )

    render_event_tab(
        event_date=date(2026, 2, 9),
        default_orgs=["anthropic", "openai", "google"],
        org_options={"Foundation model companies": FOUNDATION_MODEL_ORGS},
        window_key="superbowl",
    )


# ==================================================================
# TAB 3: DOD Dispute
# ==================================================================
with tab3:
    st.header("Pentagon AI Dispute — Did the DOD Fight Shift Sentiment?")
    st.markdown(
        "Explore how the Department of Defense dispute affected AI media coverage "
        "across weapons companies, foundation models, and government entities."
    )

    render_event_tab(
        event_date=date(2026, 1, 1),
        default_orgs=["anthropic", "openai", "google", "anduril", "palantir", "department_of_defense"],
        org_options={
            "Foundation models": FOUNDATION_MODEL_ORGS,
            "Weapons companies": WEAPONS_ORGS,
            "Government": GOVERNMENT_ORGS,
        },
        window_key="dod",
        event_date_configurable=True,
        event_date_key="dod_event_date",
        event_date_default=date(2026, 1, 1),
    )


# ==================================================================
# TAB 4: USA Deep Dive
# ==================================================================
with tab4:
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

        us_metric = st.radio(
            "Color map by", ["Sentiment (avg tone)", "Article volume"], horizontal=True, key="us_metric"
        )

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
