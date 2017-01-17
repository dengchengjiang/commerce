const mongoose = require('mongoose')
const Schema = mongoose.Schema
let product = new Schema({
    belong_category: [{
        first: String,
        second: String,
        third: String
    }],
    product_spec: {
        compact: [],
        hardOrSoft: [],
        type: [],
        features: [],
        pattern: [],
        color: [],
        material: []
    },
    product_price: [{
        compile_vip_price: String,
        compile_normal_price: String,
        compile_image: String
    }],
    product_danWei: {
        danWei_key: String,
        danWei_value: String
    },
    product_market: {
        market_method: String,
        market_amount: String
    },
    product_images: [{
        title: String,
        url: String
    }],
    product_video_link: String,
    product_stock_status: String,
    product_sell_status: String,
    product_supplier: String,
    product_id: String,
    product_remark: String,
    product_remark_de: String,
    product_title: String,
    product_title_de: String,
    product_quantity: Number,
    update_time: Number,
    online: Boolean
})


module.exports = product