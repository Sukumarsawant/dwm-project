# Presentation generation prompt: BasketIQ

Create a polished, defense-ready presentation for the Data Warehousing and Mining project **BasketIQ: Retail Basket Recommendations and RFM Customer Segmentation with Association Mining**. The presentation should explain the actual application, data workflow, three algorithms, current results, and limitations. Target 11 slides for an 8-10 minute college project presentation, with concise speaker notes and a clear story from raw transactions to a useful retail decision.

## Audience and visual direction

- Audience: computer engineering faculty and students who know basic data mining but may not know association-rule metrics.
- Canvas: 16:9 widescreen. Use a clean product and academic style, not a generic AI template.
- Visual identity: use the BasketIQ dashboard palette: deep charcoal/navy, white, indigo, and restrained teal/green for offers and savings. Use consistent typography, generous whitespace, clear charts, and small source footers.
- Use product-style UI mockups only when they explain an implemented screen. Do not invent customers, transactions, screenshots, model outputs, or business results.
- Prefer one main message per slide. Keep body copy short; move definitions and presentation guidance to speaker notes.

## Project facts to preserve

- Dataset: UCI Online Retail, from a UK-based non-store retailer, December 2010 to December 2011.
- Source rows: 541,909. The project's cleaning workflow removes duplicates, cancelled invoices, non-positive quantity or price, and missing customer identifiers, leaving **392,692 cleaned transaction lines**.
- Stored artifacts contain **4,338 customers**, **3,665 distinct product stock codes**, **442 Apriori frequent itemsets** (README-reported), and **190 saved Apriori association rules**.
- Apriori training settings: minimum support 0.015; rules filtered at lift >= 1.2.
- FP-Growth is implemented as an alternative, on-demand association miner over the cleaned invoice-item matrix. Do not claim measured speed or accuracy superiority: the repository does not store a controlled comparison.
- K-Means uses RFM features (recency, frequency, monetary), log1p transformation, standardization, K=4, ten initializations, and seed 42. It segments customers; it does not predict purchases.
- Stored K-Means segment profiles:
  - VIP / high value: 713 customers; mean recency 12.17 days; 13.75 orders; mean monetary value £8,088.02.
  - Lost / inactive: 1,622; 181.51 days; 1.32 orders; £341.00.
  - New / recent: 837; 17.70 days; 2.19 orders; £557.32.
  - Loyal regular: 1,166; 71.64 days; 4.08 orders; £1,801.78.
- The app is a React dashboard with an Express API and Python analytics services using pandas, mlxtend, and scikit-learn. It includes a dashboard, basket analysis, association rules, customer segments, and a product marketplace.
- Marketplace recommendations demonstrate a **simulated 10% add-on discount**. Prices are historical unit-price values from the project catalogue; the app has no live stock, payment, checkout, or measured promotion uplift.
- Keep association distinct from causation. Do not describe association rules as forecasts or individual purchase probabilities.
- Team: **Sukumar Sawant (24102B0049), Rohit Soneji (24102B0059), Piyush Gupta (24102B0054)**, Department of Computer Engineering, Vidyalankar Institute of Technology, Mumbai, India.

## Slide-by-slide plan

1. **Cover** — project title, institute, department, all three students and IDs. Use a subtle retail basket / connected-product visual.
2. **The retail question** — explain why one product may be bought with another and why customers with different RFM histories need different strategies. State the project objective in one sentence.
3. **Dataset and preparation** — show a clean funnel from 541,909 source rows to 392,692 cleaned lines; list the cleaning decisions and the 2010-2011 coverage. Include a citation to UCI.
4. **Product architecture** — diagram: transaction CSV -> cleaning and invoice/customer aggregates -> Apriori / FP-Growth / K-Means -> Python/Express API -> BasketIQ dashboard and marketplace. Distinguish the two mining tasks.
5. **Apriori: from basket to rule** — explain candidate generation and downward closure with a small illustrative basket example. Define support, confidence, and lift with one compact formula or example. Report 442 frequent itemsets and 190 saved rules, support 0.015 and lift >= 1.2.
6. **FP-Growth: the alternative** — explain item ordering, FP-tree compression, and conditional pattern growth. Contrast the processing strategy with Apriori, not their unmeasured performance. State that it runs on demand and a controlled benchmark remains future work.
7. **K-Means: customer profiles** — show the RFM -> log1p -> standardization -> K=4 flow. Use a clean 4-segment chart/table with customer counts and mean monetary values; add recency/frequency in compact labels. Explain clusters are descriptive profiles, not purchase predictions.
8. **Marketplace add-on offer** — mock up the implemented workflow: add a product, receive an association-based suggestion, add the suggestion to see a simulated 10% discount and estimated savings. Clearly mark historical catalogue prices and demo-only offer; do not imply checkout/payment is live.
9. **Dashboard and findings** — show the actual product interface sections (overview, basket analysis, segments, rules, marketplace). Summarize what an analyst can inspect and avoid fabricated uplift, runtime, silhouette, or predictive-accuracy numbers.
10. **Limitations, next steps, and conclusion** — call out the one-year, single-retailer data, lack of current price/inventory data, no controlled Apriori-vs-FP-Growth benchmark, and no promotion experiment. Suggest a repeatable runtime benchmark, cluster stability evaluation, and randomized offer test. End with the project contribution and team.
11. **References and Q&A** — UCI Online Retail DOI 10.24432/C5BW33; Agrawal and Srikant (1994), Apriori; Han, Pei, and Yin (2000), FP-Growth; MacQueen (1967), K-Means. Keep citations legible and reserve the final line for questions.

## Output requirements

Deliver an editable PowerPoint deck with consistent alignment, readable charts, useful speaker notes, and source citations on the relevant slides. Keep all counts and thresholds exactly as provided above. If a visual metric or result is not in this brief or the project artifacts, omit it rather than estimate it. Use original diagrams and illustrative basket examples, clearly labeling examples as illustrative.
