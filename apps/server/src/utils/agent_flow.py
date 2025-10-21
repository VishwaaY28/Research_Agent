import streamlit as st
import json
import re
from crewai import Crew, Task
from agents import url_fetcher, scraper, reporter

st.set_page_config(page_title="Product Analyzer", layout="centered")
st.title("📊 Product Analyzer")


# ✅ Schema validation function
def is_valid_url_object(obj):
    return isinstance(obj, dict) and "URL" in obj and "Description" in obj


# ✅ Basic URL format validator
def is_valid_url(url):
    return url.startswith("http://") or url.startswith("https://")


# ✅ Utility to clean markdown and extract JSON
def extract_json(raw_output: str):
    raw = raw_output.strip().replace("```json", "").replace("```", "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        return json.loads(raw)
    elif raw.startswith("{") and raw.endswith("}"):
        return json.loads(raw)
    else:
        raise ValueError("Agent output is not valid JSON.")


# Step 1: Get user input
company_name = st.text_input("Enter the company name", value="Microsoft")
product_name = st.text_input("Enter the product name", value="Word")

if st.button("🔍 Fetch URLs"):
    task_url_search = Task(
        description=f"Search for top 5 trustworthy URLs about '{product_name}' from '{company_name}'.",
        expected_output="Return a valid JSON array of 5 objects with keys 'URL' and 'Description'.",
        agent=url_fetcher
    )

    crew_initial = Crew(
        agents=[url_fetcher],
        tasks=[task_url_search],
        llm=url_fetcher.llm,
        verbose=True
    )

    url_output = crew_initial.kickoff()

    try:
        parsed_json = extract_json(str(url_output))
        url_list = [obj for obj in parsed_json if is_valid_url_object(obj)]
        st.session_state["urls"] = url_list
    except Exception as e:
        st.error(f"❌ Failed to parse agent output: {e}")
        st.session_state["urls"] = []

# Step 2: HITL URL Selection
if "urls" in st.session_state:
    st.subheader("✅ Select URLs to scrape")
    selected_urls: list[str] = []

    for i, item in enumerate(st.session_state["urls"]):
        url = item["URL"]
        desc = item["Description"]

        if st.checkbox(url, key=f"url_{i}"):
            if is_valid_url(url):
                selected_urls.append(url)

        if desc:
            st.caption(desc)

    st.text("➕ Optionally add more URLs below:")
    additional_urls = st.text_area(
        "Additional URLs (comma-separated)",
        placeholder="https://example.com, https://another.com",
        key="additional_urls_input"
    )

    if additional_urls.strip():
        extra = [u.strip() for u in additional_urls.split(",") if is_valid_url(u.strip())]
        selected_urls.extend(extra)

    # ✅ Preview selected URLs
    if selected_urls:
        st.subheader("🔍 Preview of Selected URLs")
        for u in selected_urls:
            st.markdown(f"- {u}")

    if selected_urls and st.button("🧠 Generate Summary Report"):
        # ✅ Updated scraper task with structured JSON output
        task_scrape = Task(
            description=(
                f"Scrape the following URLs about '{product_name}' from '{company_name}':\n{selected_urls}\n\n"
                "From the full scraped content, extract a list of radar items. Each item must be a dictionary with the following keys:\n"
                "- name (string)\n- ring (string)\n- quadrant (string)\n- isNew (boolean)\n- status (string)\n- description (HTML string)\n\n"
                "Return a JSON object with a key 'items' containing this list. Do not include plain URLs or unrelated content."
            ),
            expected_output="A JSON object with a key 'items' containing a list of radar items with fields: name, ring, quadrant, isNew, status, description.",
            agent=scraper
        )

        task_report = Task(
            description=(
                f"Based on the structured radar items extracted from these URLs about '{product_name}' by '{company_name}':\n"
                f"{selected_urls}\n\n"
                "Write a concise summary (max 100 words) that explains what the product is, its purpose, and how users benefit from it. "
                "Ignore irrelevant or repetitive content like navigation menus, footers, or unrelated product listings. "
                "Use clear markdown formatting with short paragraphs or bullet points. "
                "At the end, include a 'Sources:' section listing the exact URLs used."
            ),
            expected_output=(
                "A markdown-formatted summary under 100 words that includes:\n"
                "- A bold product name as the heading\n"
                "- A short paragraph introducing the product and its purpose\n"
                "- Three bullet points highlighting key benefits\n"
                "- A 'Sources:' section listing the exact URLs used"
            ),
            agent=reporter
        )

        crew_final = Crew(
            agents=[scraper, reporter],
            tasks=[task_scrape, task_report],
            llm=reporter.llm,
            verbose=True
        )

        final_output = crew_final.kickoff()

        # ✅ Try parsing radar items first
        try:
            parsed = extract_json(str(final_output))
            radar_items = parsed.get("items", [])
            if radar_items:
                st.subheader("📦 Extracted Radar Items (CSV-style)")
                st.markdown("**name, ring, quadrant, isNew, status, description**")
                for item in radar_items:
                    csv_line = f"{item['name']},{item['ring']},{item['quadrant']},{item['isNew']},{item['status']},\"{item['description']}\""
                    st.markdown(csv_line)
            else:
                raise ValueError("No radar items found.")
        except Exception:
            # Fallback to markdown summary
            st.subheader("📝 Final Product Summary")
            st.markdown(final_output)
