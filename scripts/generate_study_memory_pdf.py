from __future__ import annotations

import html
import json
import os
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "study-memory-capa-data.js"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "EG_Dashboard_Study_Memory_Capa_2026-07-13.pdf"

INK = HexColor("#171A19")
MUTED = HexColor("#656B68")
LINE = HexColor("#D8DAD7")
PAPER = HexColor("#F7F7F3")
GREEN = HexColor("#1F7A55")
GREEN_SOFT = HexColor("#EAF5EF")
BLUE = HexColor("#246BCE")
BLUE_SOFT = HexColor("#EAF1FB")
AMBER = HexColor("#A66308")
AMBER_SOFT = HexColor("#FFF4DE")
RED = HexColor("#B9382D")
RED_SOFT = HexColor("#FCECEA")
PURPLE = HexColor("#7755A6")


def find_node() -> str:
    configured = os.environ.get("NODE_EXE")
    candidates = [
        configured,
        shutil.which("node"),
        str(
            Path.home()
            / ".cache"
            / "codex-runtimes"
            / "codex-primary-runtime"
            / "dependencies"
            / "node"
            / "bin"
            / "node.exe"
        ),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    raise RuntimeError("Node.js executable was not found.")


def load_data() -> dict:
    script = (
        "global.window=global;"
        "require('./data/study-memory-capa-data.js');"
        "process.stdout.write(JSON.stringify(global.studyMemoryCapaData));"
    )
    result = subprocess.run(
        [find_node(), "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def register_fonts() -> None:
    regular = Path("C:/Windows/Fonts/malgun.ttf")
    bold = Path("C:/Windows/Fonts/malgunbd.ttf")
    if not regular.exists() or not bold.exists():
        raise RuntimeError("Malgun Gothic fonts are required to render Korean text.")
    pdfmetrics.registerFont(TTFont("Malgun", str(regular)))
    pdfmetrics.registerFont(TTFont("Malgun-Bold", str(bold)))


def safe(value: object) -> str:
    return html.escape(str(value if value is not None else ""))


def parse_number(value: str) -> float:
    cleaned = str(value).replace(",", "").replace("*", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleK",
            parent=base["Title"],
            fontName="Malgun-Bold",
            fontSize=24,
            leading=30,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=4 * mm,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleK",
            fontName="Malgun",
            fontSize=10,
            leading=16,
            textColor=MUTED,
            spaceAfter=4 * mm,
        ),
        "h1": ParagraphStyle(
            "H1K",
            fontName="Malgun-Bold",
            fontSize=16,
            leading=21,
            textColor=INK,
            spaceBefore=2 * mm,
            spaceAfter=3 * mm,
        ),
        "h2": ParagraphStyle(
            "H2K",
            fontName="Malgun-Bold",
            fontSize=11,
            leading=15,
            textColor=INK,
            spaceBefore=2 * mm,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "BodyK",
            fontName="Malgun",
            fontSize=8.5,
            leading=13,
            textColor=INK,
            spaceAfter=1.8 * mm,
        ),
        "small": ParagraphStyle(
            "SmallK",
            fontName="Malgun",
            fontSize=7,
            leading=10.5,
            textColor=MUTED,
        ),
        "table_head": ParagraphStyle(
            "TableHeadK",
            fontName="Malgun-Bold",
            fontSize=7.2,
            leading=9.5,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "table_cell": ParagraphStyle(
            "TableCellK",
            fontName="Malgun",
            fontSize=7.2,
            leading=10.2,
            textColor=INK,
        ),
        "table_cell_bold": ParagraphStyle(
            "TableCellBoldK",
            fontName="Malgun-Bold",
            fontSize=7.2,
            leading=10.2,
            textColor=INK,
        ),
        "table_tiny": ParagraphStyle(
            "TableTinyK",
            fontName="Malgun",
            fontSize=6.4,
            leading=9.2,
            textColor=INK,
        ),
        "callout": ParagraphStyle(
            "CalloutK",
            fontName="Malgun",
            fontSize=8,
            leading=12,
            textColor=INK,
        ),
        "source": ParagraphStyle(
            "SourceK",
            fontName="Malgun",
            fontSize=6.5,
            leading=9.5,
            textColor=BLUE,
        ),
    }


def para(text: object, style: ParagraphStyle) -> Paragraph:
    return Paragraph(safe(text).replace("\n", "<br/>"), style)


def link_para(label: str, url: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(
        f'<link href="{safe(url)}" color="#246BCE">{safe(label)}</link>',
        style,
    )


def make_table(
    rows: list[list[object]],
    widths: list[float],
    header_rows: int = 1,
    total_row: int | None = None,
) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=header_rows, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, header_rows - 1), INK),
        ("TEXTCOLOR", (0, 0), (-1, header_rows - 1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(header_rows, len(rows)):
        if row_index % 2 == 0:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), PAPER))
    if total_row is not None:
        style.extend(
            [
                ("BACKGROUND", (0, total_row), (-1, total_row), GREEN_SOFT),
                ("LINEABOVE", (0, total_row), (-1, total_row), 0.8, GREEN),
            ]
        )
    table.setStyle(TableStyle(style))
    return table


def dram_chart(annual: dict, styles: dict[str, ParagraphStyle]) -> Drawing:
    years = annual["years"]
    company_rows = annual["rows"][:3]
    values = [[parse_number(v) for v in row["values"]] for row in company_rows]
    drawing = Drawing(720, 245)
    chart = VerticalBarChart()
    chart.x = 55
    chart.y = 44
    chart.height = 165
    chart.width = 560
    chart.data = values
    chart.categoryAxis.categoryNames = years
    chart.categoryAxis.labels.fontName = "Malgun"
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 1200
    chart.valueAxis.valueStep = 200
    chart.valueAxis.labels.fontName = "Malgun"
    chart.valueAxis.labels.fontSize = 6.5
    chart.valueAxis.gridStrokeColor = LINE
    chart.valueAxis.gridStrokeDashArray = [2, 2]
    chart.barWidth = 10
    chart.groupSpacing = 10
    chart.barSpacing = 2
    palette = [GREEN, BLUE, AMBER]
    for index, color in enumerate(palette):
        chart.bars[index].fillColor = color
        chart.bars[index].strokeColor = color
    drawing.add(chart)
    legend = Legend()
    legend.x = 632
    legend.y = 190
    legend.fontName = "Malgun"
    legend.fontSize = 7
    legend.dx = 8
    legend.dy = 8
    legend.deltay = 15
    legend.colorNamePairs = [
        (palette[index], company_rows[index]["label"]) for index in range(3)
    ]
    drawing.add(legend)
    return drawing


def annual_table(section: dict, styles: dict[str, ParagraphStyle]) -> Table:
    annual = section["annualModel"]
    years = annual["years"]
    rows: list[list[object]] = [
        [para("Company", styles["table_head"])]
        + [para(year, styles["table_head"]) for year in years]
    ]
    total_row = None
    for row in annual["rows"]:
        rendered = [para(row["label"], styles["table_cell_bold"])]
        previous = None
        for index, value in enumerate(row["values"]):
            current = parse_number(value)
            if index == 0 or previous in (None, 0):
                note = "base" if annual.get("showYoy", True) else ""
            elif annual.get("showYoy", True):
                note = f"YoY {(current / previous - 1) * 100:+.1f}%"
            else:
                note = ""
            text = f"<b>{safe(value)}</b>"
            if note:
                text += f"<br/><font color='#656B68'>{safe(note)}</font>"
            rendered.append(Paragraph(text, styles["table_cell"]))
            previous = current
        rows.append(rendered)
        if row.get("total"):
            total_row = len(rows) - 1
    total_width = 255 * mm
    widths = [36 * mm] + [(total_width - 36 * mm) / len(years)] * len(years)
    return make_table(rows, widths, total_row=total_row)


def hbm_table(section: dict, styles: dict[str, ParagraphStyle]) -> Table:
    hbm = section["hbmAllocation"]
    rows: list[list[object]] = [
        [para("Company", styles["table_head"])]
        + [para(year, styles["table_head"]) for year in hbm["years"]]
    ]
    for row in hbm["rows"]:
        rendered = [para(row["label"], styles["table_cell_bold"])]
        for value in row["values"]:
            rendered.append(
                Paragraph(
                    f"<b>{safe(value['wpm'])}</b><br/><font color='#656B68'>{safe(value['share'])}</font>",
                    styles["table_cell"],
                )
            )
        rows.append(rendered)
    return make_table(rows, [39 * mm] + [54 * mm] * len(hbm["years"]))


def timeline_table(
    section: dict,
    styles: dict[str, ParagraphStyle],
    compact: bool = False,
) -> Table:
    status_labels = {
        "operational": "Operational",
        "online": "Online",
        "ramp": "Ramp",
        "equipment": "Tool-in / qualification",
        "construction": "Construction",
        "planned": "Planned",
    }
    rows: list[list[object]] = [
        [
            para("Company", styles["table_head"]),
            para("Quarter", styles["table_head"]),
            para("Status", styles["table_head"]),
            para("Milestone", styles["table_head"]),
            para("Detail and evidence", styles["table_head"]),
        ]
    ]
    for company in section.get("companyRows", []):
        first = True
        for quarter, cell in company.get("cells", {}).items():
            sources = []
            for index in cell.get("sourceIndexes", []):
                if index < len(company.get("sources", [])):
                    sources.append(company["sources"][index]["label"])
            evidence = cell.get("detail", "") + "\n" + cell.get("basis", "")
            if sources:
                evidence += "\nSource: " + ", ".join(sources)
            rows.append(
                [
                    para(company["company"] if first else "", styles["table_cell_bold"]),
                    para(quarter, styles["table_cell_bold"]),
                    para(status_labels.get(cell.get("status"), cell.get("status", "")), styles["table_tiny"]),
                    Paragraph(
                        f"<b>{safe(cell.get('value', ''))}</b><br/><font color='#656B68'>{safe(cell.get('delta', ''))}</font>",
                        styles["table_cell"],
                    ),
                    para(evidence, styles["table_tiny"]),
                ]
            )
            first = False
    table = make_table(rows, [29 * mm, 22 * mm, 31 * mm, 42 * mm, 131 * mm])
    if compact:
        table.setStyle(
            TableStyle(
                [
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
    return table


def source_register(data: dict, styles: dict[str, ParagraphStyle]) -> Table:
    collected: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for section_key, section in data["sections"].items():
        source_groups = [
            section.get("annualModel", {}).get("sources", []),
            section.get("hbmAllocation", {}).get("sources", []),
        ]
        source_groups.extend(row.get("sources", []) for row in section.get("companyRows", []))
        for sources in source_groups:
            for source in sources:
                url = source.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)
                collected.append((section_key.upper(), source.get("label", "Source"), url))
    rows: list[list[object]] = [
        [
            para("Section", styles["table_head"]),
            para("Source", styles["table_head"]),
            para("Domain", styles["table_head"]),
        ]
    ]
    for section, label, url in collected:
        rows.append(
            [
                para(section, styles["table_cell_bold"]),
                link_para(label, url, styles["source"]),
                para(urlparse(url).netloc, styles["table_tiny"]),
            ]
        )
    table = make_table(rows, [24 * mm, 144 * mm, 87 * mm])
    table.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 2.2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
            ]
        )
    )
    return table


def callout_box(items: list[str], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[Paragraph(f"<b>{index}.</b> {safe(item)}", styles["callout"])] for index, item in enumerate(items, 1)]
    table = Table(rows, colWidths=[255 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), GREEN_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.7, GREEN),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, HexColor("#C7DED0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def draw_page(canvas, doc, updated_at: str) -> None:
    canvas.saveState()
    width, height = landscape(A4)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(16 * mm, 13 * mm, width - 16 * mm, 13 * mm)
    canvas.setFont("Malgun", 6.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(16 * mm, 8 * mm, f"EG Dashboard | Study - Memory Capa | As of {updated_at}")
    canvas.drawRightString(width - 16 * mm, 8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(data: dict) -> Path:
    register_fonts()
    styles = build_styles()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=landscape(A4),
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=15 * mm,
        bottomMargin=18 * mm,
        title="EG Dashboard Study Memory Capacity",
        author="EG Dashboard",
        subject="DRAM, HBM, NAND and HDD capacity review",
    )
    story: list[object] = []

    story.append(para("EG Dashboard Study - Memory Capacity", styles["title"]))
    story.append(
        para(
            f"DRAM, HBM, NAND, HDD 공급능력 로드맵 재검증 보고서 | 기준일 {data['updatedAt']}",
            styles["subtitle"],
        )
    )
    story.append(para("이번 점검에서 수정한 내용", styles["h1"]))
    story.append(
        callout_box(
            [
                "Micron의 기존 '1-gamma / HBM4' 표기를 정정했습니다. HBM4는 1-beta 기반으로 이미 고용량 출하 중이며, 1-gamma는 2027년 양산 목표인 HBM4E에 적용됩니다.",
                "Micron New York Fab 1의 2026년 7월 9일 첫 콘크리트 타설과 2035년까지 2,500억 달러 이상 미국 투자, 장기 미국 DRAM 생산 비중 40% 목표를 추가했습니다. WPM과 wafer-out 시점은 미공개라 연말 CAPA에는 더하지 않았습니다.",
                "Kioxia와 SanDisk의 BiCS10은 K2 생산 개시와 1Tb TLC 샘플 출하를 구분해 보강했습니다. 332단, 4.8Gb/s 인터페이스, BiCS8 대비 bit density 59% 개선을 반영했습니다.",
                "Yokkaichi +30K는 회사 공식 WPM이 아니라 외부 추정치임을 표에 명시했습니다. Kioxia와 SanDisk는 같은 JV 물리 CAPA를 공유하므로 합산하지 않습니다.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(para("해석 원칙", styles["h1"]))
    story.append(
        callout_box(
            [
                "Official: 회사 발표·SEC 공시에서 일정 또는 제품 상태를 직접 확인한 항목입니다.",
                "Estimate: 증권사·산업 자료의 WPM, 설계 최대치, 노드 전환 대상 규모입니다.",
                "Dashboard scenario: 공개 일정 사이를 연결한 연말 모델입니다. 회사 가이던스나 실제 wafer input이 아닙니다.",
                "HBM wafer allocation은 전공정 core-die 투입량이며 TSV·패키징 CAPA나 HBM 완제품 출하량과 다릅니다.",
            ],
            styles,
        )
    )

    dram = data["sections"]["dram"]
    story.append(PageBreak())
    story.append(para("DRAM - 연말 Wafer CAPA", styles["h1"]))
    story.append(para(dram["subtitle"], styles["body"]))
    story.append(dram_chart(dram["annualModel"], styles))
    story.append(annual_table(dram, styles))
    story.append(Spacer(1, 2.5 * mm))
    story.append(para(dram["annualModel"]["note"], styles["small"]))

    story.append(PageBreak())
    story.append(para("DRAM - HBM Front-end Wafer Allocation", styles["h1"]))
    story.append(hbm_table(dram, styles))
    story.append(Spacer(1, 3 * mm))
    story.append(para(dram["hbmAllocation"]["note"], styles["body"]))
    story.append(
        callout_box(
            [
                "Samsung과 SK hynix의 수치는 2026년 6월 리서치 막대값을 범위로 재구성한 추정치입니다.",
                "Micron은 공개 capacity model을 대시보드 총 DRAM CAPA 분모에 맞춘 범위입니다.",
                "2029E Micron은 공개 근거가 부족해 N/D로 유지했습니다.",
            ],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(para("DRAM - 분기별 Fab 및 제품 Milestone", styles["h1"]))
    story.append(para("표의 WPM은 설계 최대치·증설분·회사 총량이 혼재하므로 같은 열끼리 단순 합산하지 않습니다.", styles["body"]))
    story.append(timeline_table(dram, styles))

    nand = data["sections"]["nand"]
    story.append(PageBreak())
    story.append(para("NAND - Capacity Actions", styles["h1"]))
    story.append(para(nand["subtitle"], styles["body"]))
    story.append(annual_table(nand, styles))
    story.append(Spacer(1, 2.5 * mm))
    story.append(para(nand["annualModel"]["note"], styles["small"]))
    story.append(Spacer(1, 4 * mm))
    story.append(
        callout_box(
            [
                "Samsung Xi'an과 SK hynix Dalian 수치는 신규 순증과 노드 전환 대상이 섞여 있어 총 NAND WPM으로 해석하면 안 됩니다.",
                "Kioxia·SanDisk K2는 동일 설비입니다. 두 회사 행을 합산하면 시장 CAPA를 이중 계상합니다.",
                "Micron Singapore는 2H28 첫 wafer-out 목표가 공식이지만 WPM은 공개되지 않았습니다.",
            ],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(para("NAND - 분기별 Milestone", styles["h1"]))
    story.append(timeline_table(nand, styles))

    hdd = data["sections"]["hdd"]
    story.append(PageBreak())
    story.append(para("HDD - 공급능력 Proxy", styles["h1"]))
    story.append(para(hdd["subtitle"], styles["body"]))
    story.append(
        callout_box(
            [
                "Seagate: 44TB Mozaic 4+가 두 hyperscaler에서 인증·volume shipping 중입니다.",
                "WD: 40TB UltraSMR ePMR는 두 hyperscaler 인증 중이며 2H26 volume production 목표입니다.",
                "Toshiba: 30-34TB SMR 샘플 출하가 시작됐고 28TB CMR 샘플은 3Q26 목표입니다.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 1 * mm))
    story.append(timeline_table(hdd, styles, compact=True))

    story.append(PageBreak())
    story.append(para("Source Register", styles["h1"]))
    story.append(
        para(
            "링크를 클릭하면 원문으로 이동합니다. 회사 공식 발표와 SEC 공시를 우선하고, WPM이 공개되지 않은 영역만 증권사·산업 추정을 보조적으로 사용했습니다.",
            styles["body"],
        )
    )
    story.append(source_register(data, styles))

    doc.build(
        story,
        onFirstPage=lambda canvas, current_doc: draw_page(canvas, current_doc, data["updatedAt"]),
        onLaterPages=lambda canvas, current_doc: draw_page(canvas, current_doc, data["updatedAt"]),
    )
    return OUTPUT_FILE


def main() -> None:
    data = load_data()
    output = build_pdf(data)
    print(output)


if __name__ == "__main__":
    main()
