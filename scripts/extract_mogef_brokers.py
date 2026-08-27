"""성평등가족부 국제결혼중개업체 공시 PDF를 CSV와 요약문으로 변환한다."""

from __future__ import annotations

import csv
import re
from collections import Counter, OrderedDict
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "sources" / "international_marriage_brokers_2026-07_official.pdf"
CSV_OUTPUT = ROOT / "data" / "international_marriage_brokers_2026-07.csv"
SUMMARY_OUTPUT = ROOT / "data" / "international_marriage_brokers_2026-07_summary.md"

AS_OF = "2026-07-31"
PUBLISHED_AT = "2026-08-21"
SOURCE_URL = "https://www.mogef.go.kr/io/ind/io_ind_s005d.do?bbtSn=65&mid=old919"

PROVINCES = {
    "서울",
    "부산",
    "대구",
    "인천",
    "광주",
    "대전",
    "울산",
    "세종",
    "경기",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
}

FIELDS = [
    "공시기준일",
    "공시시도",
    "공시번호",
    "시군구명",
    "상호명",
    "대표자성명_법인명",
    "신고등록일_원문",
    "신고등록일_ISO",
    "소재지_도로명주소",
    "전화번호",
    "인터넷_홈페이지",
    "영업상태_원문",
    "영업상태_분류",
    "처분일자",
    "처분내용",
    "처분비고",
    "공시행_구분",
    "원본_PDF_페이지",
]


def plain(value: str | None) -> str:
    """일반 셀의 줄바꿈과 연속 공백을 정리한다."""
    return re.sub(r"\s+", " ", value or "").strip()


def admin_text(value: str | None) -> str:
    """행정처분 문구는 원래 줄 구분을 슬래시로 남긴다."""
    parts = [plain(part) for part in (value or "").splitlines() if plain(part)]
    return " / ".join(parts)


def website_text(value: str | None) -> str:
    """PDF가 한 URL을 여러 줄로 자른 경우 복원하고, 복수 URL은 구분한다."""
    parts = [plain(part) for part in (value or "").splitlines() if plain(part)]
    if not parts:
        return ""

    urls: list[str] = []
    for part in parts:
        is_new = bool(re.match(r"^(?:https?://|www\.|cafe\.|xn--)", part, re.I))
        if urls and is_new:
            urls.append(part)
        elif urls:
            urls[-1] += part
        else:
            urls.append(part)
    return " | ".join(urls)


def phone_text(value: str | None) -> str:
    parts = [plain(part) for part in (value or "").splitlines() if plain(part)]
    if not parts:
        return ""
    result: list[str] = []
    for part in parts:
        if result and re.match(r"^(?:0\d|1\d{3})", part):
            result.append(part)
        elif result:
            result[-1] += f" {part}"
        else:
            result.append(part)
    return " | ".join(result)


def normalize_date(value: str | None) -> str:
    raw = plain(value).strip("'`\"")
    compact = re.sub(r"\s+", "", raw)
    if re.fullmatch(r"\d{8}", compact):
        year, month, day = compact[:4], compact[4:6], compact[6:]
        return f"{year}-{month}-{day}"

    match = re.fullmatch(r"(\d{2}|\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[.]?", compact)
    if not match:
        return ""
    year, month, day = match.groups()
    if len(year) == 2:
        year = f"20{year}"
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"


def status_category(value: str | None) -> str:
    status = plain(value)
    for category in ("등록취소", "폐업", "휴업", "전출", "영업"):
        if category in status:
            return category
    return "미기재"


def row_kind(number: str, company: str, status: str) -> str:
    if number:
        return "공식집계업체"
    if "분사무소" in company:
        return "분사무소"
    if status_category(status) in {"폐업", "등록취소", "전출"}:
        return "참고공시_비영업"
    return "참고공시_번호없음"


def join_continuation(existing: str, addition: str, column: int) -> str:
    if not addition:
        return existing
    if not existing:
        return addition
    if column == 7:  # 홈페이지 URL은 줄바꿈 없이 이어져야 하는 경우가 많다.
        return f"{existing}\n{addition}"
    return f"{existing}\n{addition}"


def extract() -> tuple[list[dict[str, str]], OrderedDict[str, int], int]:
    records: list[dict[str, str]] = []
    province_counts: OrderedDict[str, int] = OrderedDict()
    current_province = ""
    official_total = 0
    last_raw: list[str] | None = None

    with pdfplumber.open(SOURCE) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            table = page.extract_table() or []
            for source_row in table:
                row = [(cell or "").strip() for cell in (source_row + [""] * 12)[:12]]
                flattened = [plain(cell) for cell in row]

                if not any(flattened):
                    continue
                if flattened[0] == "업체수" or "처분일자" in flattened:
                    continue

                number, district, company = flattened[:3]
                remaining_filled = any(flattened[2:])
                if district == "계" and number.isdigit() and not remaining_filled:
                    official_total = int(number)
                    last_raw = None
                    continue
                if district in PROVINCES and number.isdigit() and not remaining_filled:
                    current_province = district
                    province_counts[district] = int(number)
                    last_raw = None
                    continue

                is_numbered_record = number.isdigit() and bool(company)
                is_unnumbered_record = not number and bool(district and company) and sum(bool(v) for v in flattened) >= 5

                if is_numbered_record or is_unnumbered_record:
                    last_raw = row
                    record = {
                        "공시기준일": AS_OF,
                        "공시시도": current_province,
                        "공시번호": number,
                        "시군구명": plain(row[1]),
                        "상호명": plain(row[2]),
                        "대표자성명_법인명": plain(row[3]),
                        "신고등록일_원문": plain(row[4]),
                        "신고등록일_ISO": normalize_date(row[4]),
                        "소재지_도로명주소": plain(row[5]),
                        "전화번호": phone_text(row[6]),
                        "인터넷_홈페이지": website_text(row[7]),
                        "영업상태_원문": plain(row[8]),
                        "영업상태_분류": status_category(row[8]),
                        "처분일자": admin_text(row[9]),
                        "처분내용": admin_text(row[10]),
                        "처분비고": admin_text(row[11]),
                        "공시행_구분": row_kind(number, company, row[8]),
                        "원본_PDF_페이지": str(page_number),
                    }
                    records.append(record)
                    continue

                # PDF 셀 안에서 URL이나 문장이 다음 표 행으로 밀린 경우 직전 레코드에 합친다.
                if last_raw is not None and records and not number and not district and not company:
                    for column, addition in enumerate(row):
                        if addition:
                            last_raw[column] = join_continuation(last_raw[column], addition, column)
                    latest = records[-1]
                    latest.update(
                        {
                            "대표자성명_법인명": plain(last_raw[3]),
                            "신고등록일_원문": plain(last_raw[4]),
                            "신고등록일_ISO": normalize_date(last_raw[4]),
                            "소재지_도로명주소": plain(last_raw[5]),
                            "전화번호": phone_text(last_raw[6]),
                            "인터넷_홈페이지": website_text(last_raw[7]),
                            "영업상태_원문": plain(last_raw[8]),
                            "영업상태_분류": status_category(last_raw[8]),
                            "처분일자": admin_text(last_raw[9]),
                            "처분내용": admin_text(last_raw[10]),
                            "처분비고": admin_text(last_raw[11]),
                        }
                    )

    return records, province_counts, official_total


def write_csv(records: list[dict[str, str]]) -> None:
    CSV_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUTPUT.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(records)


def write_summary(
    records: list[dict[str, str]], province_counts: OrderedDict[str, int], official_total: int
) -> None:
    numbered = [record for record in records if record["공시행_구분"] == "공식집계업체"]
    extra = [record for record in records if record["공시행_구분"] != "공식집계업체"]
    numbered_statuses = Counter(record["영업상태_분류"] for record in numbered)
    extra_kinds = Counter(record["공시행_구분"] for record in extra)

    lines = [
        "# 전국 국제결혼중개업체 공시 목록 요약",
        "",
        f"- 공시 기준일: {AS_OF}",
        f"- 게시일: {PUBLISHED_AT}",
        f"- 공식 집계: {official_total:,}곳",
        f"- CSV 공식 집계업체 행: {len(numbered):,}개",
        f"- CSV 참고 공시 행: {len(extra):,}개",
        f"- 출처: [성평등가족부 결혼중개업체 공시 현황]({SOURCE_URL})",
        "",
        "## 시도별 공식 집계",
        "",
        "| 시도 | 업체 수 |",
        "|---|---:|",
    ]
    lines.extend(f"| {province} | {count:,} |" for province, count in province_counts.items())
    lines.extend(
        [
            f"| 합계 | {sum(province_counts.values()):,} |",
            "",
            "## 공식 집계업체 상태",
            "",
            "| 상태 | 업체 수 |",
            "|---|---:|",
        ]
    )
    lines.extend(f"| {status} | {count:,} |" for status, count in numbered_statuses.most_common())
    lines.extend(
        [
            "",
            "## 번호 없는 참고 공시 행",
            "",
            "| 구분 | 행 수 |",
            "|---|---:|",
        ]
    )
    lines.extend(f"| {kind} | {count:,} |" for kind, count in extra_kinds.most_common())
    lines.extend(
        [
            "",
            "> 원본 PDF에는 공식 업체 수에 포함되는 번호 부여 행 외에도 분사무소, 폐업, 등록취소, 전출 등의 참고 행이 함께 수록되어 있습니다. CSV의 `공시행_구분`으로 구별할 수 있습니다.",
            "",
            "> 공공데이터는 시점 이후 변경될 수 있으므로 실제 영업 여부나 제휴 가능성은 관할 시군구 또는 업체에 다시 확인해야 합니다.",
        ]
    )
    SUMMARY_OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    records, province_counts, official_total = extract()
    numbered_count = sum(record["공시행_구분"] == "공식집계업체" for record in records)
    regional_total = sum(province_counts.values())

    if official_total != numbered_count:
        raise RuntimeError(f"공식 합계({official_total})와 추출 번호 행({numbered_count})이 다릅니다.")
    if official_total != regional_total:
        raise RuntimeError(f"공식 합계({official_total})와 시도 합계({regional_total})가 다릅니다.")

    write_csv(records)
    write_summary(records, province_counts, official_total)
    print(f"공식 집계업체 {numbered_count}곳, 참고 행 {len(records) - numbered_count}개를 추출했습니다.")
    print(CSV_OUTPUT)
    print(SUMMARY_OUTPUT)


if __name__ == "__main__":
    main()
