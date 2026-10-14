import csv

# Asian countries
ASIA_COUNTRIES = {
    "Afghanistan", "Armenia", "Azerbaijan", "Bahrain",
    "Bangladesh", "Bhutan", "Brunei", "Cambodia", "China",
    "Cyprus", "Georgia", "India", "Indonesia", "Iran",
    "Iraq", "Israel", "Japan", "Jordan", "Kazakhstan",
    "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Malaysia",
    "Maldives", "Mongolia", "Myanmar", "Nepal", "North Korea",
    "Oman", "Pakistan", "Palestine", "Philippines", "Qatar",
    "Russia", "Saudi Arabia", "Singapore", "South Korea",
    "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand",
    "Timor-Leste", "Turkey", "Turkmenistan", "United Arab Emirates",
    "Uzbekistan", "Vietnam", "Yemen"
}

# -------------------------
# 1. Filter airports
# -------------------------

asian_airports = {}
asian_rows = []

with open("airports.dat", "r", encoding="utf-8") as f:
    reader = csv.reader(f)

    for row in reader:
        if len(row) < 8:
            continue

        airport_id = row[0]
        country = row[3]

        if country in ASIA_COUNTRIES:
            asian_airports[airport_id] = row
            asian_rows.append(row)

with open("asia_airports.dat", "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(asian_rows)


# -------------------------
# 2. Filter routes
# -------------------------

asian_routes = []

with open("routes.dat", "r", encoding="utf-8") as f:
    reader = csv.reader(f)

    for row in reader:
        if len(row) < 8:
            continue

        source_id = row[3]
        destination_id = row[5]

        # Both airports must be in Asia
        if source_id in asian_airports and destination_id in asian_airports:
            asian_routes.append(row)

with open("asia_routes.dat", "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(asian_routes)


print("Asian airports:", len(asian_airports))
print("Asian routes:", len(asian_routes))
print("Created:")
print("  asia_airports.dat")
print("  asia_routes.dat")