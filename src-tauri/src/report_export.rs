// Генерация Excel-отчёта (v0.5.0) — один файл, два листа ("Сотрудники"/"Партнёры"),
// стилизация под бренд приложения (тёмно-синий/золотой, см. tauri.conf.json/theme.css),
// ширина колонок — автоподбор по содержимому (rust_xlsxwriter::Worksheet::autofit).

use crate::db::{EmployeeReportRow, PartnerReportRow};
use rust_xlsxwriter::{Color, Format, FormatBorder, Workbook};
use std::path::Path;

const BRAND_NAVY: Color = Color::RGB(0x14213D);
const BRAND_GOLD: Color = Color::RGB(0xF5C518);

fn header_format() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(BRAND_GOLD)
        .set_font_color(BRAND_NAVY)
        .set_border(FormatBorder::Thin)
}

fn cell_format() -> Format {
    Format::new().set_border(FormatBorder::Thin)
}

pub fn generate_report_workbook(
    employee_rows: &[EmployeeReportRow],
    partner_rows: &[PartnerReportRow],
    out_path: &Path,
) -> Result<(), String> {
    let mut workbook = Workbook::new();
    let header_fmt = header_format();
    let cell_fmt = cell_format();

    // ---- Лист "Сотрудники" ----
    let sheet = workbook.add_worksheet();
    sheet.set_name("Сотрудники").map_err(|e| e.to_string())?;
    let headers = [
        "ФИО", "Табельный номер", "Подразделение", "Должность",
        "Часов отработано", "Заявки на отсутствие", "Регламентов", "Проектов",
    ];
    for (col, title) in headers.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *title, &header_fmt).map_err(|e| e.to_string())?;
    }
    for (i, row) in employee_rows.iter().enumerate() {
        let r = (i + 1) as u32;
        sheet.write_string_with_format(r, 0, &row.full_name, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_string_with_format(r, 1, &row.employee_number, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_string_with_format(r, 2, row.department_name.as_deref().unwrap_or("—"), &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_string_with_format(r, 3, row.position_title.as_deref().unwrap_or("—"), &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_number_with_format(r, 4, (row.hours_worked * 100.0).round() / 100.0, &cell_fmt).map_err(|e| e.to_string())?;
        let absences = if row.absence_counts.is_empty() {
            "—".to_string()
        } else {
            row.absence_counts.iter().map(|(t, c)| format!("{t}: {c}")).collect::<Vec<_>>().join(", ")
        };
        sheet.write_string_with_format(r, 5, &absences, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_number_with_format(r, 6, row.regulations_count as f64, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_number_with_format(r, 7, row.projects_count as f64, &cell_fmt).map_err(|e| e.to_string())?;
    }
    sheet.set_freeze_panes(1, 0).map_err(|e| e.to_string())?;
    sheet.autofit();

    // ---- Лист "Партнёры" ----
    let sheet = workbook.add_worksheet();
    sheet.set_name("Партнёры").map_err(|e| e.to_string())?;
    let headers = ["Партнёр", "Клиентов добавлено", "Регламентов", "Финансовый итог", "Примечание"];
    for (col, title) in headers.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *title, &header_fmt).map_err(|e| e.to_string())?;
    }
    for (i, row) in partner_rows.iter().enumerate() {
        let r = (i + 1) as u32;
        sheet.write_string_with_format(r, 0, &row.partner_name, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_number_with_format(r, 1, row.clients_added_count as f64, &cell_fmt).map_err(|e| e.to_string())?;
        sheet.write_number_with_format(r, 2, row.regulations_count as f64, &cell_fmt).map_err(|e| e.to_string())?;
        match row.financial_total {
            Some(total) => { sheet.write_number_with_format(r, 3, (total * 100.0).round() / 100.0, &cell_fmt).map_err(|e| e.to_string())?; }
            None => { sheet.write_string_with_format(r, 3, "—", &cell_fmt).map_err(|e| e.to_string())?; }
        }
        let note = if row.financial_total_partial {
            "Не все суммы удалось распознать"
        } else {
            ""
        };
        sheet.write_string_with_format(r, 4, note, &cell_fmt).map_err(|e| e.to_string())?;
    }
    sheet.set_freeze_panes(1, 0).map_err(|e| e.to_string())?;
    sheet.autofit();

    workbook.save(out_path).map_err(|e| e.to_string())?;
    Ok(())
}
