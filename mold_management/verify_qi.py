
import frappe
from mold_management.api.production_log_api import add_production_log_entry

def test_qi_reading_logic():
    # Setup mock data
    job_card = frappe.get_all("Job Card", limit=1)[0].name
    time_slot = frappe.get_all("Production Time Slots", limit=1)[0].name
    
    # Test Case 1: Numeric Template + Numeric Value
    readings1 = [
        {"specification": "Weight", "reading_value": "10.5", "is_numeric": 1}
    ]
    log1 = add_production_log_entry(job_card, time_slot, 10, 0, create_qi=True, qi_readings=readings1)
    
    # Test Case 2: Non-Numeric Template + String Value
    readings2 = [
        {"specification": "Visual", "reading_value": "PASS", "is_numeric": 0}
    ]
    log2 = add_production_log_entry(job_card, time_slot, 10, 0, create_qi=True, qi_readings=readings2)
    
    print(f"Test logs created: {log1}, {log2}")

if __name__ == "__main__":
    test_qi_reading_logic()
