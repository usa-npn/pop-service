"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// the csv headers are not the same as the db column names so we map them here
function renameHeaders(sheetName, headerString) {
    let rows = headerString.split("\n");
    let headers = rows[0].split(",");
    for (let header of headers) {
        if (sheetMappings[sheetName][header])
            headerString = headerString.replace(header, sheetMappings[sheetName][header]);
    }
    return headerString;
}
exports.renameHeaders = renameHeaders;
let sheetMappings = {
    "observation": {
        "observation_id": "Observation_ID",
        "site_id": "Site_ID",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "elevation_in_meters": "Elevation_in_Meters",
        "state": "State",
        "species_id": "Species_ID",
        "genus": "Genus",
        "species": "Species",
        "common_name": "Common_Name",
        "individual_id": "Individual_ID",
        "phenophase_id": "Phenophase_ID",
        "phenophase_description": "Phenophase_Description",
        "first_yes_sample_size": "First_Yes_Sample_Size",
        "mean_first_yes_year": "Mean_First_Yes_Year",
        "mean_first_yes_doy": "Mean_First_Yes_DOY",
        "mean_first_yes_julian_date": "Mean_First_Yes_Julian_Date",
        "se_first_yes_in_days": "SE_First_Yes_In_Days",
        "sd_first_yes_in_days": "SD_First_Yes_In_Days",
        "min_first_yes_doy": "Min_First_Yes_DOY",
        "max_first_yes_doy": "Max_First_Yes_DOY",
        "median_first_yes_doy": "Median_First_Yes_DOY",
        "mean_numdays_since_prior_no": "Mean_NumDays_Since_Prior_No",
        "se_numdays_since_prior_no": "SE_NumDays_Since_Prior_No",
        "sd_numdays_since_prior_no": "SD_NumDays_Since_Prior_No",
        "last_yes_sample_size": "Last_Yes_Sample_Size",
        "mean_last_yes_year": "Mean_Last_Yes_Year",
        "mean_last_yes_doy": "Mean_Last_Yes_DOY",
        "mean_last_yes_julian_date": "Mean_Last_Yes_Julian_Date",
        "se_last_yes_in_days": "SE_Last_Yes_in_Days",
        "sd_last_yes_in_days": "SD_Last_Yes_in_Days",
        "min_last_yes_doy": "Min_Last_Yes_DOY",
        "max_last_yes_doy": "Max_Last_Yes_DOY",
        "median_last_yes_doy": "Median_Last_Yes_DOY",
        "mean_numdays_until_next_no": "Mean_NumDays_Until_Next_No",
        "se_numdays_until_next_no": "SE_NumDays_Until_Next_No",
        "sd_numdays_until_next_no": "SD_NumDays_Until_Next_No",
        "num_individuals_with_multiple_firsty": "Num_Individuals_with_Multiple_FirstY",
        "individuals_ids_with_multiple_firsty": "Multiple_FirstY_Individual_IDs",
        "observed_status_conflict_flag_individual_ids": "Observed_Status_Conflict_Flag_Individual_IDs",
        "observation_date": "Observation_Date",
        "phenophase_status": "Phenophase_Status",
        "dataset_id": "Dataset_ID",
        "observedby_person_id": "ObservedBy_Person_ID",
        "submission_id": "Submission_ID",
        "submittedby_person_id": "SubmittedBy_Person_ID",
        "submission_datetime": "Submission_Datetime",
        "updatedby_person_id": "UpdatedBy_Person_ID",
        "update_datetime": "Update_Datetime",
        "partner_group": "Partner_Group",
        "site_name": "Site_Name",
        "kingdom": "Kingdom",
        "species_functional_type": "Species_Functional_Type",
        "species_category": "Species_Category",
        "usda_plants_symbol": "USDA_PLANTS_Symbol",
        "itis_number": "ITIS_Number",
        "plant_nickname": "Plant_Nickname",
        "patch": "Patch",
        "protocol_id": "Protocol_ID",
        "phenophase_category": "Phenophase_Category",
        "phenophase_name": "Phenophase_Name",
        "phenophase_definition_id": "Phenophase_Definition_ID",
        "secondary_species_specific_definition_id": "Species-Specific_Info_ID",
        "species-specific_info_id": "Species-Specific_Info_ID",
        "observation_time": "Observation_Time",
        "day_of_year": "Day_of_Year",
        "first_yes_year": "First_Yes_Year",
        "first_yes_month": "First_Yes_Month",
        "first_yes_day": "First_Yes_Day",
        "first_yes_doy": "First_Yes_DOY",
        "first_yes_julian_date": "First_Yes_Julian_Date",
        "numdays_since_prior_no": "NumDays_Since_Prior_No",
        "last_yes_year": "Last_Yes_Year",
        "last_yes_month": "Last_Yes_Month",
        "last_yes_day": "Last_Yes_Day",
        "last_yes_doy": "Last_Yes_DOY",
        "last_yes_julian_date": "Last_Yes_Julian_Date",
        "numdays_until_next_no": "NumDays_Until_Next_No",
        "numys_in_series": "NumYs_in_Series",
        "numqs_in_series": "NumQs_in_Series",
        "numdays_in_series": "NumDays_in_Series",
        "intensity_category_id": "Intensity_Category_ID",
        "intensity_value": "Intensity_Value",
        "abundance_value": "Abundance_Value",
        "observation_group_id": "Site_Visit_ID",
        "observation_comments": "Observation_Comments",
        "multiple_observers": "Multiple_Observers",
        "multiple_firsty": "Multiple_FirstY",
        "observed_status_conflict_flag": "Observed_Status_Conflict_Flag",
        "status_conflict_related_records": "Status_Conflict_Related_Records",
        "tmax_winter": "Tmax_Winter",
        "tmax_spring": "Tmax_Spring",
        "tmax_summer": "Tmax_Summer",
        "tmax_fall": "Tmax_Fall",
        "tmax": "Tmax",
        "tmin": "Tmin",
        "tmaxf": "Tmax_in_F",
        "tminf": "Tmin_in_F",
        "tmin_winter": "Tmin_Winter",
        "tmin_spring": "Tmin_Spring",
        "tmin_summer": "Tmin_Summer",
        "tmin_fall": "Tmin_Fall",
        "prcp_winter": "Prcp_Winter",
        "prcp_spring": "Prcp_Spring",
        "prcp_summer": "Prcp_Summer",
        "prcp_fall": "Prcp_Fall",
        "prcp": "Prcp",
        "gdd": "AGDD",
        "gddf": "AGDD_in_F",
        "mean_gdd": "Mean_AGDD",
        "mean_gddf": "Mean_AGDD_in_F",
        "se_gdd": "SE_AGDD",
        "se_gddf": "SE_AGDD_in_F",
        "daylength": "Daylength",
        "acc_prcp": "Accum_Prcp",
        "mean_accum_prcp": "Mean_Accum_Prcp",
        "se_accum_prcp": "SE_Accum_Prcp",
        "mean_daylength": "Mean_Daylength",
        "se_daylength": "SE_Daylength"
    },
    "dataset": {
        "dataset_id": "Dataset_ID",
        "dataset_name": "Dataset_Name",
        "dataset_description": "Dataset_Description",
        "dataset_citation": "Dataset_Citation",
        "contact_name": "Contact_Name",
        "contact_institution": "Contact_Institution",
        "contact_description": "Contact_Description",
        "contact_email": "Contact_Email",
        "contact_phone": "Contact_Phone",
        "contact_address": "Contact_Address",
        "dataset_comments": "Dataset_Comments",
        "dataset_documentation_url": "Dataset_Documentation_URL"
    },
    "observer": {
        "person_id": "Person_ID",
        "read_online_training_materials": "Read_Online_Training_Materials",
        "trained_in_person": "Trained_in_Person",
        "place_of_training": "Place_of_Training",
        "ecological_experience": "Ecological_Experience",
        "eco_experience_comments": "Eco_Experience_Comments",
        "self_described_naturalist": "Self-Described_Naturalist",
        "naturalist_skill_level": "Naturalist_Skill_Level",
        "participate_as_part_of_job": "Participation_as_Part_of_Job",
        "type_of_job": "Type_of_Job",
        "job_comments": "Job_Comments",
        "lpl_certified": "LPL_Certified",
        "lpl_certified_date": "LPL_Certified_Date"
    },
    "station": {
        "site_id": "Site_ID",
        "site_type": "Site_Type",
        "site_name": "Site_Name",
        "state": "State",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "lat_long_datum": "Lat_Long_Datum",
        "lat_long_source": "Lat_Long_Source",
        "elevation_in_meters": "Elevation_in_Meters",
        "elevation_source": "Elevation_Source",
        "degree_of_development_surrounding_site": "Degree_of_Development_Surrounding_Site",
        "landscape_description": "Landscape_Description",
        "proximity_to_road": "Proximity_to_Road",
        "proximity_to_permanent_water": "Proximity_to_Permanent_Water",
        "area_of_site": "Area_of_Site",
        "type_of_forest_at_site": "Type_of_Forest_at_Site",
        "presence_of_slope": "Presence_of_Slope",
        "location_relative_to_slope": "Location_Relative_to_Slope",
        "slope_aspect": "Slope_Aspect",
        "presence_of_domesticated_cats": "Presence_of_Domesticated_Cats",
        "presence_of_domesticated_dogs": "Presence_of_Domesticated_Dogs",
        "presence_of_domesticated_animals": "Presence_of_Domesticated_Animals",
        "presence_of_garden": "Presence_of_Garden",
        "presence_of_bird_feeder": "Presence_of_Bird_Feeder",
        "presence_of_nesting_box": "Presence_of_Nesting_Box",
        "presence_of_fruit": "Presence_of_Fruit",
        "presence_of_birdbath": "Presence_of_Birdbath",
        "presence_of_other_features_designed_to_attact_animals": "Presence_of_Other_Features_Designed_to_Attract_Animals",
        "site_comments": "Site_Comments",
        "site_registration_date": "Site_Registration_Date"
    },
    "individual": {
        "individual_id": "Individual_ID",
        "scientific_name": "Scientific_Name",
        "individual_userstr": "Plant_Nickname",
        "patch": "Patch",
        "patch_size": "Patch_Size",
        "shade_status": "Shade_Status",
        "wild": "Wild",
        "watered": "Watered",
        "fertilized": "Fertilized",
        "gender": "Gender",
        "planting_date": "Planting_Date",
        "comment": "Plant_Comments",
        "plant_registration_date": "Plant_Registration_Date",
        "death_date_observed": "Death_Date_Observed",
        "last_date_observed_alive": "Last_Date_Observed_Alive",
        "death_reason": "Death_Reason",
        "death_comments": "Death_Comments",
        "plant_image_url": "Plant_Image_URL",
        "plant_image_upload_date": "Plant_Image_Upload_Date"
    },
    "species_protocol": {
        "dataset_id": "Dataset_ID",
        "species_id": "Species_ID",
        "protocol_id": "Protocol_ID",
        "start_date": "Species_Protocol_Start_Date",
        "end_date": "Species_Protocol_End_Date"
    },
    "protocol": {
        "protocol_id": "Protocol_ID",
        "protocol_name": "Protocol_Name",
        "primary_name": "Datasheet_Title",
        "secondary_name": "Datasheet_Subtitle",
        "phenophase_list": "Suite_of_Phenophase_IDs",
        "protocol_comments": "Protocol_Comments"
    },
    "phenophase": {
        "phenophase_id": "Phenophase_ID",
        "phenophase_description": "Phenophase_Description",
        "definition_ids": "Phenophase_Definition_IDs",
        "phenophase_names": "Phenophase_Names",
        "phenophase_revision_comments": "Phenophase_Revision_Comments"
    },
    "phenophase_definition": {
        "definition_id": "Phenophase_Definition_ID",
        "dataset_id": "Dataset_ID",
        "phenophase_id": "Phenophase_ID",
        "phenophase_name": "Phenophase_Name",
        "definition": "Phenophase_Definition",
        "start_date": "Phenophase_Definition_Start_Date",
        "end_date": "Phenophase_Definition_End_Date",
        "comments": "Phenophase_Definition_Comments"
    },
    "sspi": {
        "sspi_id": "Species-Specific_Info_ID",
        "phenophase_id": "Phenophase_ID",
        "species_id": "Species_ID",
        "additional_definition": "Secondary_Species-Specific_Definition",
        "abundance_category": "Intensity_Category_ID",
        "effective_datetime": "Sp-Sp_Info_Start_Date",
        "deactivation_datetime": "Sp-Sp_Info_End_Date"
    },
    "intensity": {
        "abundance_category_id": "Intensity_Category_ID",
        "abundance_category_name": "Intensity_Category_Name",
        "abundance_category_description": "Intensity_Question",
        "intensity_value_options": "Intensity_Value_Options"
    },
    "obs_group": {
        "observation_group_id": "Site_Visit_ID",
        "travel_time": "Travel_Time",
        "total_observation_time": "Total_Observation_Time",
        "animal_search_time": "Animal_Search_Time",
        "animal_search_method": "Animal_Search_Method",
        "snow_on_ground": "Snow_on_Ground",
        "percent_snow_cover": "Percent_Snow_Cover",
        "snow_in_tree_canopy": "Snow_in_Tree_Canopy"
    }
};
//# sourceMappingURL=headerMappings.js.map