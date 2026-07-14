TOILET ||--o| TOILET_FIXTURE : has
TOILET ||--o| TOILET_FACILITY : has
TOILET ||--o{ TOILET_OPERATING_HOUR : has
TOILET ||--o{ TOILET_REVIEW : receives
TOILET ||--o{ POST : has
POST ||--o{ COMMENT : has

TOILET {
INTEGER toilet_id PK
TEXT source_system
TEXT source_id
TEXT local_government_code
TEXT toilet_type
TEXT legal_basis
TEXT name
TEXT road_address
TEXT lot_address
REAL latitude
REAL longitude
TEXT geocoding_status
TEXT management_agency
TEXT phone
TEXT opening_type
TEXT opening_hours_text
TEXT ownership_type
TEXT waste_disposal_type
TEXT installed_year_month
TEXT remodeled_year_month
DATE data_reference_date
DATETIME source_updated_at
INTEGER is_active
DATETIME created_at
DATETIME updated_at
}

TOILET_FIXTURE {
INTEGER toilet_id PK, FK
INTEGER male_toilet_count
INTEGER male_urinal_count
INTEGER male_disabled_toilet_count
INTEGER male_disabled_urinal_count
INTEGER male_child_toilet_count
INTEGER male_child_urinal_count
INTEGER female_toilet_count
INTEGER female_disabled_toilet_count
INTEGER female_child_toilet_count
}

TOILET_FACILITY {
INTEGER toilet_id PK, FK
INTEGER is_safety_facility_target
INTEGER has_emergency_bell
TEXT emergency_bell_location
INTEGER has_entrance_cctv
INTEGER has_diaper_changing_table
TEXT diaper_changing_table_location
}

TOILET_OPERATING_HOUR {
INTEGER operating_hour_id PK
INTEGER toilet_id FK
INTEGER weekday
TEXT open_time
TEXT close_time
INTEGER is_24_hours
INTEGER is_closed
}

TOILET_REVIEW {
INTEGER review_id PK
INTEGER toilet_id FK
TEXT nickname
TEXT password_hash
INTEGER rating
INTEGER cleanliness_score
TEXT content
TEXT toilet_paper_status
TEXT availability_status
DATETIME visited_at
DATETIME created_at
DATETIME updated_at
}

POST {
INTEGER post_id PK
INTEGER toilet_id FK
TEXT nickname
TEXT password_hash
TEXT title
TEXT content
DATETIME created_at
DATETIME updated_at
}

COMMENT {
INTEGER comment_id PK
INTEGER post_id FK
TEXT nickname
TEXT password_hash
TEXT content
DATETIME created_at
DATETIME updated_at
}
