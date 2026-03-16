# CSV Data Files

Place your CSV files in this directory. The dashboard expects these four files:

## projects.csv
```
project_id,project_name,company,project_manager,report_date,overall_status,time_status,time_comment,cost_status,cost_comment,quality_status,quality_comment
240-DCM103,"240 DCM103","Bulk Data Centers N01 DCM103 AS","Hans Christian Hagevik","03.02.26","GREEN","According to plan","Comment here...","According to plan","Comment here...","According to plan","Comment here..."
```

**overall_status**: `GREEN`, `YELLOW`, or `RED`
**time/cost/quality_status**: `According to plan`, `Deviation to plan`, or `Major deviation to plan`

## milestones.csv
```
project_id,milestone_nr,name,date,status
240-DCM103,1,"Start-up project","2024-07-01","OK"
240-DCM103,2,"Internal planning finished","2024-12-15","OK"
240-DCM103,8,"Detail design completed","2026-06-08","MIDLERTIDIG"
```

**status**: `OK` (completed) or `MIDLERTIDIG` (in progress/provisional)
**date**: ISO format `YYYY-MM-DD`

## budget.csv
```
project_id,budget_post,budget_nok,additional_nok,budget_incl_additional_nok,paid_nok
240-DCM103,"Building costs",1999850578,0,1999850578,484433811
240-DCM103,"Outdoor areas",2000000,0,2000000,0
240-DCM103,"SUM - PROJECT COST",2283893107,0,2283893107,516106790
```

**All amounts are in NOK** (not thousands). The row with `SUM - PROJECT COST` is treated as the total.

## issues.csv
```
project_id,issue_nr,problem,handling_plan,responsible,deadline
240-DCM103,1,"Internal processes ongoing...","Update 01.05.2025: Latest schedule...","OJ","ASAP"
240-DCM103,9,"CTS ability to deliver quality...","With the understanding that...","OJ","2025-10-02"
```

**deadline**: ISO format `YYYY-MM-DD` or `ASAP`

## Adding Multiple Projects

Add additional rows to each CSV with a different `project_id`. The dashboard will automatically show navigation between projects.
