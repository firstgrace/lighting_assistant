"""Compare simple regressors for condition-level visibility ratings.

Synthetic responses are only for pipeline verification. They are not research results.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--features",
        type=Path,
        default=Path("dataset/features/condition_features.csv"),
    )
    parser.add_argument(
        "--responses",
        type=Path,
        default=Path("dataset/responses/responses.csv"),
    )
    parser.add_argument(
        "--synthetic-responses",
        action="store_true",
        help="Create deterministic synthetic responses when responses.csv is unavailable.",
    )
    return parser.parse_args()


def make_synthetic_responses(features: pd.DataFrame) -> pd.DataFrame:
    preferred = [
        "mean_luminance_mean",
        "local_contrast_mean",
        "edge_density_mean",
        "highlight_ratio_mean",
    ]
    available = [name for name in preferred if name in features.columns]
    if not available:
        available = list(features.select_dtypes(include=[np.number]).columns[:4])
    values = features[available].astype(float)
    scaled = (values - values.mean()) / values.std(ddof=0).replace(0, 1)
    signal = scaled.mean(axis=1)
    score = np.clip(np.rint(3 + signal), 1, 5).astype(int)
    return pd.DataFrame(
        {
            "condition_id": features["condition_id"],
            "participant_id": "synthetic_pipeline_check",
            "visibility_score": score,
            "response_time_ms": 1000,
            "created_at": "synthetic",
        }
    )


def evaluate_model(name: str, model, x_train, x_test, y_train, y_test) -> dict:
    model.fit(x_train, y_train)
    prediction = model.predict(x_test)
    return {
        "model": name,
        "MAE": mean_absolute_error(y_test, prediction),
        "RMSE": mean_squared_error(y_test, prediction) ** 0.5,
        "R2": r2_score(y_test, prediction),
    }


def main() -> None:
    args = parse_args()
    if not args.features.exists():
        raise FileNotFoundError(
            f"{args.features} does not exist. Generate condition_features.csv first."
        )
    features = pd.read_csv(args.features)
    if args.responses.exists():
        responses = pd.read_csv(args.responses)
        response_source = str(args.responses)
    elif args.synthetic_responses:
        responses = make_synthetic_responses(features)
        response_source = "deterministic synthetic pipeline-check data"
    else:
        raise FileNotFoundError(
            f"{args.responses} does not exist. Supply responses.csv or use --synthetic-responses."
        )

    responses["visibility_score"] = pd.to_numeric(
        responses["visibility_score"], errors="coerce"
    )
    responses = responses[
        responses["visibility_score"].between(1, 5, inclusive="both")
    ]
    condition_scores = (
        responses.groupby("condition_id", as_index=False)["visibility_score"]
        .mean()
        .rename(columns={"visibility_score": "visibility_score_mean"})
    )
    merged = features.merge(condition_scores, on="condition_id", how="inner")
    if len(merged) < 8:
        raise ValueError("At least 8 rated conditions are required for comparison.")

    x = merged.drop(columns=["condition_id", "visibility_score_mean"]).select_dtypes(
        include=[np.number]
    )
    x = x.replace([np.inf, -np.inf], np.nan).fillna(x.median())
    y = merged["visibility_score_mean"]
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42
    )

    baseline_prediction = np.full(len(y_test), y_train.mean())
    results = [
        {
            "model": "Mean baseline",
            "MAE": mean_absolute_error(y_test, baseline_prediction),
            "RMSE": mean_squared_error(y_test, baseline_prediction) ** 0.5,
            "R2": r2_score(y_test, baseline_prediction),
        },
        evaluate_model(
            "Linear regression",
            make_pipeline(StandardScaler(), LinearRegression()),
            x_train,
            x_test,
            y_train,
            y_test,
        ),
        evaluate_model(
            "Ridge regression",
            make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
            x_train,
            x_test,
            y_train,
            y_test,
        ),
        evaluate_model(
            "Random forest",
            RandomForestRegressor(
                n_estimators=300,
                random_state=42,
                min_samples_leaf=2,
                n_jobs=-1,
            ),
            x_train,
            x_test,
            y_train,
            y_test,
        ),
    ]
    print(f"Response source: {response_source}")
    print(f"Conditions: {len(merged)}, features: {x.shape[1]}")
    print(pd.DataFrame(results).to_string(index=False, float_format=lambda value: f"{value:.4f}"))
    if response_source.startswith("deterministic synthetic"):
        print("\nWARNING: Synthetic-response metrics verify code only and are not research results.")


if __name__ == "__main__":
    main()
