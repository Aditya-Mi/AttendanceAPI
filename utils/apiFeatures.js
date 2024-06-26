class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        let queryObj = { ...this.queryString };
        const excludeFields = ["page", "sort", "limit", "fields", "category"];
        excludeFields.forEach((el) => delete queryObj[el]);

        // adding category Filters
        if (this.queryString.category) {
            const categoryFields = this.queryString.category.split(",");
            queryObj["category"] = { $all: categoryFields };
        }

        // 1B) ADVANCE Filtering
        // Link-- base?price[gte]=200
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

        queryStr = this.convertDateFields(queryStr);

        // Query

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sorting() {
        if (this.queryString.sort) {
            const sort = this.queryString.sort.split(",").join(" ");
            this.query = this.query.sort(sort);
        } else {
            this.query = this.query.sort("-createdAt");
        }

        return this;
    }


    convertDateFields(queryStr) {
        const dateFields = ['date']; // Add more date fields as needed
        dateFields.forEach(field => {
            const regex = new RegExp(`"${field}":"(.*?)"`, 'g');
            queryStr = queryStr.replace(regex, (match, p1) => {
                const date = new Date(p1); // Assuming date is in ISO format or a format that Date constructor can parse
                return `"${field}":{"$date":"${date.toISOString()}"}`;
            });
        });
        return queryStr;
    }

    limitFields() {
        // 3) Limiting  Field (for getting limiting field in result)
        // Link - base?fields=price,duration,difficulty ---for getting price ,duration and difficulty
        if (this.queryString.fields) {
            const fields = this.queryString.fields
                .split(",")
                .join(" ")
                .replace("role", "");
            this.query = this.query.select(`${fields} `);
        } else {
            this.query = this.query.select("-__v -role -edit");
        }
        return this;
    }

    pagination() {
        // Pagination (getting limiting result and page)
        // Link --- base?page=1&limit=10 -----for getting page 1 and no of item 10

        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;
