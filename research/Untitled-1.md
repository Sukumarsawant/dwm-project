# Project: CrashScope

## ML-Powered Road Accident Severity Analysis & Pattern Mining

Act as a senior machine learning engineer, data engineer, and UI/UX designer. Build a complete, functional, polished Data Warehousing and Mining (DWM) project named **CrashScope**.

Do not create just a dashboard mockup. Implement the actual data-processing pipeline, data warehouse, machine-learning models, association-rule mining, clustering, evaluation metrics, and interactive visualizations.

The application must run locally and use the actual dataset supplied with the project.

---

## 1. PROJECT OBJECTIVE

CrashScope is an interactive road-accident analytics platform that uses machine learning to classify recorded accident severity, discovers recurring combinations of accident conditions, groups similar accident records, and supports multidimensional analysis through a data warehouse.

The project should answer three main questions:

1. Given recorded accident characteristics, what severity category does the trained ML model predict?
2. Which combinations of weather, lighting, road surface, road type, and other categorical conditions frequently occur together in accident records?
3. What groups of similar accident records can be identified using clustering?

The application must combine the following DWM concepts:

* ETL and data preprocessing.
* Data warehouse design and star schema.
* OLAP operations.
* Decision Tree classification.
* Naive Bayes classification.
* Apriori association rule mining.
* K-means clustering.
* Interactive analytics and visualization.

The primary ML model must be the Decision Tree classifier. Naive Bayes is the comparison model, Apriori discovers associations, and K-means performs clustering.

## 2. DATASET

The supplied dataset archive contains:

* `AccidentsBig.csv`
* `VehiclesBig.csv`
* `CasualtiesBig.csv`

The files are related through identifiers such as `Accident_Index` and vehicle references.

The archive contains approximately 60,000 accident records per source table after removing completely blank rows. Recalculate and validate the actual counts during ingestion rather than hardcoding them.

The dataset contains fields such as:

### Accident attributes

* `Accident_Index`
* `Date`
* `Time`
* `Accident_Severity`
* `Number_of_Vehicles`
* `Number_of_Casualties`
* `Day_of_Week`
* `Road_Type`
* `Speed_limit`
* `Junction_Detail`
* `Junction_Control`
* `Light_Conditions`
* `Weather_Conditions`
* `Road_Surface_Conditions`
* `Urban_or_Rural_Area`
* `longitude`
* `latitude`

### Vehicle attributes

* `Accident_Index`
* `Vehicle_Reference`
* `Vehicle_Type`
* `Vehicle_Manoeuvre`
* `Skidding_and_Overturning`
* `Age_of_Driver`
* `Sex_of_Driver`
* `Age_of_Vehicle`
* `Engine_Capacity_(CC)`
* `1st_Point_of_Impact`

### Casualty attributes

* `Accident_Index`
* `Vehicle_Reference`
* `Casualty_Reference`
* `Casualty_Class`
* `Age_of_Casualty`
* `Sex_of_Casualty`
* `Casualty_Severity`
* `Casualty_Type`

First inspect the actual column names, data types, code meanings, missing values, duplicates, identifier uniqueness, and relationships between the files. Do not assume every listed column is present or correctly typed.

**Dataset provenance warning:** The source has not been verified as authentic Indian road-accident data. Some administrative codes appear UK-specific, while some coordinates appear to fall within India. Treat the files as the supplied accident dataset until the provenance is independently confirmed. Do not describe results as verified Indian road-safety findings.

Do not fabricate records, labels, or dataset statistics.

## 3. ETL PIPELINE

Implement a reusable ETL pipeline.

### Extract

* Read the three CSV files from the provided archive.
* Remove completely blank rows.
* Preserve the original source files.
* Record row counts before and after cleaning.

### Transform

* Standardize column names without losing source-column mappings.
* Parse dates and times safely.
* Convert numerical columns to appropriate numeric types.
* Handle empty strings and invalid values.
* Inspect missing values and duplicates.
* Decode categorical codes into human-readable labels only when their definitions are verified.
* Derive year, month, hour, weekday, and time-of-day features when possible.
* Validate relationships between accident, vehicle, and casualty records.
* Detect duplicate accident identifiers and orphan vehicle/casualty records.
* Generate a data-quality report.

Do not silently impute every missing value. Use appropriate preprocessing pipelines and report the decisions made.

### Load

* Load cleaned tables into SQLite.
* Make the ETL process repeatable.
* Avoid modifying the original dataset.
* Display ingestion status and data-quality statistics.

## 4. DATA WAREHOUSE

Design and document a sensible analytical schema.

Use separate fact tables where the data grain differs.

### FACT_ACCIDENT

One row per accident.

Possible measures:

* Accident count.
* Number of vehicles.
* Number of casualties.

### DIM_TIME

* Date.
* Year.
* Month.
* Day.
* Day of week.
* Hour.
* Time-of-day category.

### DIM_LOCATION

* Location identifier.
* Source geographic codes.
* Latitude and longitude, where available.

Do not infer that a location is Indian without verification.

### DIM_ROAD

* Road type.
* Speed limit.
* Junction detail.
* Junction control.
* Urban/rural category.

### DIM_CONDITIONS

* Weather conditions.
* Lighting conditions.
* Road surface.
* Other recorded road conditions.

Create separate vehicle and casualty fact tables at their natural grains.

Document primary keys, foreign keys, fact-table grains, and relationships.

**Important:** Never flatten the accident, vehicle, and casualty tables into one unrestricted join before calculating accident counts. Multiple vehicles and casualties can multiply rows and distort measures.

Implement appropriate SQL queries for the dashboard.

## 5. MACHINE LEARNING MODEL 1: DECISION TREE

This is the primary ML component.

### Objective

Classify the recorded accident-severity category using appropriate accident attributes.

### Target

`Accident_Severity`, after verifying its meaning and distribution.

### Candidate input features

* `Road_Type`
* `Speed_limit`
* `Junction_Detail`
* `Junction_Control`
* `Light_Conditions`
* `Weather_Conditions`
* `Road_Surface_Conditions`
* `Urban_or_Rural_Area`
* `Number_of_Vehicles`
* `Day_of_Week`
* Hour derived from `Time`

Use only columns that actually exist and have suitable data quality.

Initially exclude `Number_of_Casualties` and casualty-related fields from the primary model because they can reveal information closely related to the severity outcome. Explain the rationale and ensure no target leakage occurs.

### Implementation

* Use scikit-learn.
* Split data into training and testing sets.
* Use a stratified split where class counts permit.
* Use a fixed random seed for reproducibility.
* Build preprocessing pipelines for categorical and numerical features.
* Handle unknown categories at inference time.
* Use a controlled tree depth and appropriate minimum leaf size.
* Investigate class imbalance.
* Do not perform preprocessing fitted on the complete dataset before splitting.
* Save the trained pipeline and metadata.

### Evaluation

Display:

* Accuracy.
* Macro-F1.
* Per-class precision.
* Per-class recall.
* Confusion matrix.
* Classification report.
* Feature importance, with a clear explanation of its limitations.

Do not use accuracy as the only metric.

### Prediction interface

Create an interactive form that accepts the model's supported input features and returns:

* Predicted severity category.
* Class probabilities, if supported by the trained estimator.
* Model version and relevant feature values.

Explain that this is a classification of the supplied conditions, not a prediction that an accident will occur.

The interface must use actual trained model outputs rather than hardcoded examples.

## 6. MACHINE LEARNING MODEL 2: NAIVE BAYES

Implement Naive Bayes as a baseline for the same severity-classification task.

* Use the same target and comparable train/test partitions as the Decision Tree.
* Choose an appropriate Naive Bayes variant for the encoded features.
* Ensure categorical and numerical inputs are handled correctly.
* Avoid negative feature values when using algorithms that require non-negative inputs.
* Compare the model with the Decision Tree using identical test records.

Display:

* Accuracy.
* Macro-F1.
* Per-class precision and recall.
* Confusion matrix.

Allow users to compare the models and explain that the better-performing model depends on the actual evaluation results.

Do not fabricate evaluation metrics.

## 7. APRIORI ASSOCIATION RULE MINING

Implement Apriori using `mlxtend`.

### Candidate categorical attributes

* `Weather_Conditions`
* `Road_Surface_Conditions`
* `Light_Conditions`
* `Road_Type`
* `Junction_Detail`
* `Urban_or_Rural_Area`
* `Accident_Severity`
* Derived time-of-day category, if available.

### Functionality

* Convert selected attributes into a suitable transaction/one-hot representation.
* Allow the user to select attributes.
* Provide configurable minimum support.
* Provide configurable minimum confidence.
* Calculate frequent itemsets.
* Generate association rules.
* Display support, confidence, and lift.
* Sort and filter the results.
* Allow exporting the rules as CSV.

Use a bounded sample or other performance controls where necessary. Show how many records were analysed.

Avoid unbounded itemset generation. Handle cases where no itemsets or rules satisfy the chosen thresholds.

Explain the metrics in simple language.

Association rules describe co-occurrence, not causation. Do not describe rules as proof that weather, lighting, or road conditions caused accidents.

## 8. K-MEANS CLUSTERING

Implement K-means to group similar accident records.

### Candidate numerical features

* `Number_of_Vehicles`
* `Number_of_Casualties`
* `Speed_limit`
* Hour derived from `Time`
* Coordinates only after validation.

Allow the user to choose a supported number of clusters, such as 2–8.

Requirements:

* Handle missing values.
* Scale numerical features.
* Use a fixed random seed.
* Fit on a manageable sample when necessary.
* Display the number of records clustered.
* Show cluster counts.
* Show average feature values by cluster.
* Visualize clusters using appropriate plots.
* Provide an explanation of how clusters differ.

Do not assume cluster labels have inherent meaning. Interpret them from their actual feature profiles.

Do not claim that clusters identify future accident hotspots without appropriate geographic and traffic-exposure validation.

## 9. OLAP EXPLORER

Build an interactive OLAP module backed by the warehouse.

Support:

### Roll-up

Aggregate accident counts across broader time or geographic levels where the dimensions support it.

### Drill-down

Move from year to month or from month to day, subject to the available data.

### Slice

Filter the dataset by one dimension, such as severity.

### Dice

Apply multiple filters simultaneously, such as road type, weather, month, and severity.

Allow users to select dimensions and measures.

Display:

* Aggregation tables.
* Interactive charts.
* Filtered record counts.
* Exportable results.

Clearly distinguish accident counts, vehicle counts, and casualty counts.

## 10. STREAMLIT DASHBOARD

Build a polished, professional dashboard.

### Page 1: Overview

* Total accident records.
* Unique accident identifiers.
* Date coverage.
* Severity distribution.
* Accident counts by hour, month, road type, and other available attributes.
* Dataset-quality indicators.

### Page 2: OLAP Explorer

* Interactive filters.
* Roll-up and drill-down.
* Slice and dice.
* Aggregation tables and charts.

### Page 3: Pattern Mining

* Apriori controls.
* Frequent itemsets.
* Association rules.
* Support, confidence, and lift.
* Rule export.

### Page 4: Model Lab

* Train/evaluate controls.
* Decision Tree and Naive Bayes comparison.
* Confusion matrices.
* Classification reports.
* Macro-F1 and per-class performance.
* Prediction form using the trained pipeline.

### Page 5: Cluster Explorer

* Cluster-count selector.
* Cluster distributions.
* Cluster summaries.
* Numerical scatter plots.
* Geographic visualization only if coordinates have been validated.

### Page 6: Data Quality

* Source-file row counts.
* Missing-value report.
* Duplicate identifiers.
* Orphan records.
* Date parsing errors.
* Column types.
* Dataset provenance warning.

The application should have clear navigation, responsive layouts, meaningful chart titles, loading states, error messages, and empty-state messages.

Do not overload the UI with charts that provide no analytical value.

## 11. TECHNOLOGY STACK

Use:

* Python.
* Pandas and NumPy.
* SQLite.
* scikit-learn.
* mlxtend.
* Streamlit.
* Plotly.

Use modular source files with clear responsibilities.

Suggested structure:

crashscope/
app.py
requirements.txt
README.md
data/
raw/
processed/
src/
data_pipeline.py
warehouse.py
classification.py
association_rules.py
clustering.py
olap.py
visualizations.py
models/
tests/

Do not commit large raw datasets or generated model artifacts to Git unless intentionally required.

## 12. QUALITY AND VALIDATION REQUIREMENTS

* Inspect the supplied archive rather than assuming its structure.
* Validate all expected columns before using them.
* Use proper train/test separation.
* Avoid target leakage.
* Keep model evaluation reproducible.
* Test all dashboard pages.
* Handle missing columns and empty datasets gracefully.
* Avoid hardcoded model metrics or fabricated results.
* Keep different fact-table grains separate.
* Add basic unit tests for ETL, Apriori, classification, and OLAP.
* Explain how to run the application locally.
* Document limitations and the dataset's uncertain geographic provenance.

## 13. EXPECTED DELIVERABLES

Produce a fully working project containing:

1. ETL pipeline.
2. SQLite analytical warehouse.
3. Documented star-schema design.
4. Decision Tree classifier.
5. Naive Bayes baseline.
6. Apriori association-rule mining.
7. K-means clustering.
8. OLAP explorer.
9. Interactive Streamlit dashboard.
10. Data-quality report.
11. README with installation and execution instructions.
12. Basic tests and reproducible model evaluation.

## 14. DEVELOPMENT ORDER

Implement the project incrementally:

1. Inspect the actual dataset.
2. Build and validate ETL.
3. Design and populate the warehouse.
4. Implement OLAP queries.
5. Implement and evaluate Decision Tree and Naive Bayes.
6. Implement Apriori.
7. Implement K-means.
8. Integrate the dashboard.
9. Run end-to-end tests.
10. Document the results and limitations.

Do not stop after producing a plan or static UI. Implement the actual code.

If an input column is unavailable, adapt gracefully and report the limitation. Never invent missing data.

The final application must run locally and demonstrate each implemented DWM component using the supplied dataset.
