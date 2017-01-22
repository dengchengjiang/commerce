const _ = require('lodash')
const express = require('express')
const router = express.Router()
const async = require('async')
const db = require('../../model/index')

var hotLabel = []
var categoryies = []
var u = []

//utils
let checkCategories = function (req, res, next) {
    if (categoryies.length == 0) {
        db.categorys.find({}, (err, result) => {
            if (err) return res.send('404')
            categoryies = result
        })
    } else if (hotLabel.length == 0) {
        db.hotLabels.find({}, null, {
            sort: {
                add_time: -1
            }
        }, (err, labels) => {
            hotLabel = labels
        })
    }
    next()
}

router.get('/', (req, res) => {
    async.parallel([
            done => {
                db.categorys
                    .find({})
                    .populate('secondCategory.thirdTitles.product')
                    .exec((err, data) => {
                        if (err) return customError(500, '数据库查询错误', res)
                        categoryies = data
                        done(err, data)
                    })
            },
            done => {
                db.hotLabels
                    .find({})
                    .exec((err, label) => {
                        if (err) return customError(500, '数据库查询错误', res)
                        done(err, label)
                    })
            },
            done => {
                db.banners.find({'type': 'carousel'}, (err, banners) => {
                    if (err) return customError(500, '数据库查询错误', res)
                    done(err, banners)
                })
            }
        ],
        (err, response) => {
            if (err) return customError(500, '数据库查询错误', res)
            let category = response[0]
            let labels = response[1]
            let banners = response[2]
            let account = null
            let statusCode = 500
            if (req.cookies["account"] != null) {
                account = req.cookies['account']
                statusCode = 200
            }
            res.render('assets/index/de', {
                title: 'ECSell',
                url: '/',
                categories: category,
                hotLabels: labels,
                banners: banners,
                user: account,
                status: statusCode,
                language: 'German'
            })
        })
})

router.get('/login', (req, res) => {
    async.parallel([
            (done) => {
                db.categorys.find({}, function (err, result) {
                    if (err) res.send('404');
                    categoryies = result;
                    done(err, result)
                });
            },
            (done) => {
                db.hotLabels.find({}, null, {
                    sort: {
                        add_time: -1
                    }
                }, function (err, labels) {
                    hotLabel = labels;
                    done(err, labels)
                })
            }
        ],
        (err, results) => {
            if (err) {
                done(err)
            } else {
                var category = results[0];
                var labels = results[1];
                var account = null;
                var statusCode = 500;
                console.log(category);
                if (req.cookies["account"] != null) {
                    account = req.cookies['account'];
                    statusCode = 200;
                }
                res.render('assets/login', {
                    title: 'ECSell',
                    categories: category,
                    hotLabels: labels,
                    user: account,
                    status: statusCode
                });
            }
        });
})

//登出处理
router.get('/logout', (req, res) => {
    res.clearCookie("account");
    res.redirect('/login');
});
//验证邮件
router.post('/validateEmail', (req, res) => {
    db.users.find({name: req.body.email}, (err, result) => {
        if (err) {
            res.end('500')
        } else {
            if (result.length > 0) {
                res.send('401');  //email has exist
            } else {
                res.send('200');
            }
        }
    })
})
//person center
router.get('/personal-center', checkCategories)
router.get('/personal-center', (req, res) => {
    var statusCode = null;
    if (req.cookies["account"] != null) {
        statusCode = 200;
    } else {
        statusCode = 500;
    }
    console.log(req.cookies["account"]);
    res.render('assets/personal-center', {
        title: 'ECSell',
        categories: categoryies,
        hotLabels: hotLabel,
        user: req.cookies['account'],
        status: statusCode
    })
})

router.get('/personal-Order', checkCategories)
router.get('/personal-Order', (req, res) => {
    var statusCode = null;
    if (req.cookies["account"] != null) {
        statusCode = 200;
    } else {
        statusCode = 500;
    }
    console.log(req.cookies["account"]);
    res.render('assets/Personal-Order', {
        title: 'ECSell',
        categories: categoryies,
        hotLabels: hotLabel,
        user: req.cookies['account'],
        status: statusCode
    })
})

router.post('/change-profile', (req, res) => {
    console.log(req.body);
    db.users.update({"nick_name": req.body.origin_nick_name}, {
        $set: {
            nick_name: req.body.new_nick_name,
            company: req.body.customers_company,
            sex: req.body.gender
        }
    }, (err, result) => {
        if (err) {
            res.send(404)
        } else {
            var changeCode = null;
            var statusCode = null;
            if (result.nModified == 0) {
                res.send({account: '', code: 500, msg: 'CHANGE FAILED'})
            } else {
                if (req.cookies["account"] != null) {
                    var name = req.cookies["account"].name;
                    var level = req.cookies["account"].level;
                    res.clearCookie("account");
                    res.cookie("account", {
                        name: name,
                        nick_name: req.body.new_nick_name,
                        company: req.body.customers_company,
                        sex: req.body.gender
                    })
                    req.cookies["account"].name = name;
                    req.cookies["account"].nick_name = req.body.new_nick_name;
                    req.cookies["account"].company = req.body.customers_company;
                    req.cookies["account"].sex = req.body.gender;
                    req.cookies["account"].level = level;
                    res.send({account: req.cookies["account"], code: 200, msg: 'SUCCESS'})
                } else {
                    res.send({account: '', code: 500, msg: 'Not LOGIN'})
                }
            }

        }
    })
})

router.post('/change-email', (req, res) => {
    db.users.update({name: req.body.old_name, password: md5(req.body.existing_password)}, {
        $set: {
            name: req.body.newEmail
        }
    }, function (err, result) {
        if (err) {
            res.send(404)
        } else {
            console.log(result);
            var changeCode = null;
            if (result.nModified == 0) {
                res.send({account: '', code: 500, msg: 'CHANGE FAILED'})
            } else {
                if (req.cookies["account"] != null) {
                    var name = req.body.newEmail;
                    var nick_name = req.cookies["account"].nick_name;
                    var company = req.cookies["account"].company;
                    res.clearCookie("account");
                    res.cookie("account", {
                        name: name,
                        nick_name: nick_name,
                        company: company,
                        sex: req.body.gender
                    });
                    req.cookies["account"].name = req.body.newEmail;
                    console.log(req.cookies["account"]);
                    res.send({account: req.cookies["account"], code: 200, msg: 'SUCCESS'})
                } else {
                    res.send({account: '', code: 500, msg: 'Not LOGIN'})
                }
            }
        }
    })
})

router.post('/change-password', (req, res) => {
    console.log(req.body);
    db.users.update({name: req.body.old_name, password: md5(req.body.existing_password_1)}, {
        $set: {
            password: md5(req.body.login_password_twice)
        }
    }, function (err, result) {
        if (err) {
            res.send(404)
        } else {
            console.log(result)
            var changeCode = null
            if (result.nModified == 0) {
                res.send({account: '', code: 500, msg: 'CHANGE FAILED'})
            } else {
                if (req.cookies["account"] != null) {
                    res.send({account: req.cookies["account"], code: 200, msg: 'SUCCESS'})
                } else {
                    res.send({account: '', code: 500, msg: 'Not LOGIN'})
                }
            }
        }
    })
})

router.post('/change-address', (req, res) => {
    console.log(req.body);
    db.users.update({name: req.body.name}, {
        $set: {
            areaCode: req.body.areaCode,
            detailAddress: req.body.detail_address
        }
    }, (err, result) => {
        if (err) {
            res.send(404)
        } else {
            console.log(result);
            var changeCode = null
            if (result.nModified == 0) {
                res.send({account: '', code: 500, msg: 'CHANGE FAILED'})
            } else {
                if (req.cookies["account"] != null) {
                    req.cookies["account"].areaCode = req.body.areaCode;
                    req.cookies["account"].detail_address = req.body.detail_address;
                    res.send({account: req.cookies["account"], code: 200, msg: 'SUCCESS'})
                } else {
                    res.send({account: '', code: 500, msg: 'Not LOGIN'})
                }
            }
        }
    })
})

router.get('/getHeadBanner', (req, res) => {
    db.banners.findOne({'type': 'headBanner', 'status': 'New'}, (err, result) => {
        if (err) throw err
        console.log(result)
        res.send(result);
    }).sort({upload_time: -1})
})

//前台注册须知界面
router.get('/team-of-use', checkCategories);
router.get('/team-of-use', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null;
            if (req.cookies["account"] != null) {
                statusCode = 200;
            } else {
                statusCode = 500;
            }
            res.render('assets/team-of-use/de', {
                system: system.register_notice[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies["account"],
                status: statusCode
            })
        }
    })
})
//关于我们界面
router.get('/about-us', checkCategories);
router.get('/about-us', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null;
            if (req.cookies["account"] != null) {
                statusCode = 200;
            } else {
                statusCode = 500;
            }
            res.render('assets/about-us/de', {
                system: system.about_us[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies["account"],
                status: statusCode
            })
        }
    })
})
//Privacy Policy
router.get('/privacy-policy', checkCategories);
router.get('/privacy-policy', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null;
            if (req.cookies["account"] != null) {
                statusCode = 200;
            } else {
                statusCode = 500;
            }

            res.render('assets/privacy-notice/de', {
                system: system.privacy_notice[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies['account'],
                status: statusCode
            })
        }
    })
})
//FAQ
router.get('/FAQ', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null
            if (req.cookies["account"] != null) {
                statusCode = 200
            } else {
                statusCode = 500
            }
            res.render('assets/faq/de', {
                system: system.FAQ[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies['account'],
                status: statusCode
            })
        }
    })
})
//attention
router.get('/attention', checkCategories)
router.get('/attention', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null;
            if (req.cookies["account"] != null) {
                statusCode = 200;
            } else {
                statusCode = 500;
            }
            res.render('assets/attention/de', {
                system: system.attention[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies['account'],
                status: statusCode
            })
        }
    })
})
//connect_us
router.get('/contact-us', checkCategories)
router.get('/contact-us', (req, res) => {
    db.de_notices.findOne({}, (err, system) => {
        if (err) {
            res.send(404)
        } else {
            var statusCode = null;
            if (req.cookies["account"] != null) {
                statusCode = 200
            } else {
                statusCode = 500
            }
            res.render('assets/contact-us/de', {
                system: system.contact_us[0],
                title: 'ECSell',
                categories: categoryies,
                hotLabels: hotLabel,
                user: req.cookies['account'],
                status: statusCode
            })
        }
    })
})


//person center
router.get('/personal-center', checkCategories)
router.get('/personal-center', (req, res) => {
    let statusCode = null
    if (req.cookies["account"] != null) {
        statusCode = 200
    } else {
        statusCode = 500
    }
    console.log(req.cookies["account"])
    res.render('assets/personal-center/de', {
        title: 'ECSell',
        categories: categoryies,
        hotLabels: hotLabel,
        user: req.cookies['account'],
        status: statusCode
    })
})

router.get('/personal-Order', checkCategories)
router.get('/personal-Order', (req, res) => {
    let statusCode = null
    if (req.cookies["account"] != null) {
        statusCode = 200
    } else {
        statusCode = 500
    }
    console.log(req.cookies["account"])
    res.render('assets/personal-order/de', {
        title: 'ECSell',
        categories: categoryies,
        hotLabels: hotLabel,
        user: req.cookies['account'],
        status: statusCode
    })
})


//三级类目查找
router.get('/product/:id', checkCategories)
router.get('/product/:id', (req, res) => {
    db.categorys
        .findOne({'secondCategory.thirdTitles.de_thirdUrl': '/de/product/' + req.params["id"]})
        .populate('secondCategory.thirdTitles.product')
        .exec((err, result) => {
            let arr = []
            let secondParam = {}
            if (result != null) {
                secondParam.firstTitle = result.firstCategory;
                secondParam.firstUrl = result.firstUrl;
                _.each(result.secondCategory, function (second) {
                    let newArr = _.filter(second.thirdTitles, function (third) {
                        secondParam.secondTitle = second.secondTitle
                        secondParam.secondUrl = second.secondUrl
                        secondParam.thirdTitle = third.thirdTitle
                        secondParam.thirdUrl = third.thirdUrl
                        return third.de_thirdUrl == '/de/product/' + req.params["id"]
                    });
                    arr = _.concat(newArr, arr)
                });
                var statusCode = null
                if (req.cookies["account"] != null) {
                    statusCode = 200;
                } else {
                    statusCode = 500;
                }

                console.log(secondParam)
                if (arr.length == 0) {
                    res.render('assets/category/de', {
                        product: [],
                        title: 'ECSell',
                        prev_category: secondParam,
                        categories: categoryies,
                        hotLabels: hotLabel,
                        user: req.cookies['account'],
                        status: statusCode
                    })
                } else {
                    console.log(arr)
                    res.render('assets/category/de', {
                        product: arr,
                        title: 'ECSell',
                        prev_category: secondParam,
                        categories: categoryies,
                        hotLabels: hotLabel,
                        user: req.cookies['account'],
                        status: statusCode
                    })
                }
            } else {
                if (req.cookies["account"] != null) {
                    statusCode = 200;
                } else {
                    statusCode = 500;
                }

                res.render('assets/404/de', {
                    product: [],
                    title: 'ECSell',
                    prev_category: secondParam,
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode
                })
            }
        })
})


//一级类目产品详情页查找
router.get('/single-product/:id', checkCategories)
router.get('/:first/single-product/:id', (req, res, next) => {
    let first = req.params["first"]
    db.products
        .find({product_id: req.params["id"]})
        .exec((err, products) => {
            let detail_params = {}
            detail_params.thirdTitle = ''
            detail_params.thirdUrl = ''
            detail_params.secondTitle = ''
            detail_params.secondUrl = ''
            let statusCode = null
            if (req.cookies["account"] != null) {
                statusCode = 200
            } else {
                statusCode = 500
            }
            if (products.length == 0) {
                res.render('assets/product-detail/de', {
                    product: [],
                    title: 'ECSell',
                    like_product: [],
                    prev_category: detail_params,
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode,
                    errorCode: 500,
                    msg: 'NOT FOUND'
                })
            } else {
                res.render('assets/product-detail/de', {
                    product: products,
                    like_product: [],
                    prev_category: detail_params,
                    title: 'ECSell',
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode
                })
            }
        })
})


//二级类目产品详情页查找
router.get('/single-product/:id', checkCategories)
router.get('/:first/:second/single-product/:id', (req, res, next) => {
    let first = req.params["first"]
    let second = req.params["second"]
    db.products
        .find({product_id: req.params["id"]})
        .exec((err, products) => {
            let detail_params = {}
            detail_params.thirdTitle = ''
            detail_params.thirdUrl = ''
            detail_params.secondTitle = ''
            detail_params.secondUrl = ''
            let statusCode = null
            if (req.cookies["account"] != null) {
                statusCode = 200
            } else {
                statusCode = 500
            }
            if (products.length == 0) {
                res.render('assets/product-detail/de', {
                    product: [],
                    title: 'ECSell',
                    like_product: [],
                    prev_category: detail_params,
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode,
                    errorCode: 500,
                    msg: 'NOT FOUND'
                })
            } else {
                res.render('assets/product-detail/de', {
                    product: products,
                    like_product: [],
                    prev_category: detail_params,
                    title: 'ECSell',
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode
                })
            }
        })
})

//三级类目产品详情页查找
router.get('/single-product/:id', checkCategories)
router.get('/:first/:second/:third/single-product/:id', (req, res, next) => {
    let first = req.params["first"]
    let second = req.params["second"]
    let third = req.params["third"]
    db.products
        .find({product_id: req.params["id"]})
        .exec((err, products) => {
            let detail_params = {}
            detail_params.thirdTitle = ''
            detail_params.thirdUrl = ''
            detail_params.secondTitle = ''
            detail_params.secondUrl = ''
            let statusCode = null
            if (req.cookies["account"] != null) {
                statusCode = 200
            } else {
                statusCode = 500
            }
            if (products.length == 0) {
                res.render('assets/product-detail/de', {
                    product: [],
                    title: 'ECSell',
                    like_product: [],
                    prev_category: detail_params,
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode,
                    errorCode: 500,
                    msg: 'NOT FOUND'
                })
            } else {
                res.render('assets/product-detail/de', {
                    product: products,
                    like_product: [],
                    prev_category: detail_params,
                    title: 'ECSell',
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode
                })
            }
        })
})

//一级&二级类目查找
router.get('/:category/:id', checkCategories);
router.get('/de/:category/:id', (req, res, next) => {
    if (req.params["id"].indexOf('_') == -1 && req.params["category"] != 'admin') {
        //一级类目
        db.categorys
            .find({'de_firstUrl': '/de/' + req.params["category"] + '/' + req.params["id"]})
            .populate('secondCategory.thirdTitles.product')
            .exec((err, result) => {
                if (result.length != 0) {
                    let secondCategory = result[0].secondCategory
                    console.log(secondCategory)
                    var statusCode = null
                    let detail_params = {}
                    detail_params.firstTitle = result[0].de_firstCategory
                    detail_params.firstUrl = result[0].de_firstUrl


                    if (typeof req.cookies["account"] != "undefined") {
                        statusCode = 200
                    } else {
                        statusCode = 500
                    }

                    console.log(typeof req.cookies["account"] != "undefined")
                    console.log(statusCode)
                    if (secondCategory.length == 0) {
                        res.render('assets/first-category/de', {
                            product: [],
                            title: 'ECSell',
                            prev_category: detail_params,
                            categories: categoryies,
                            hotLabels: hotLabel,
                            user: req.cookies['account'],
                            status: statusCode,
                            errorCode: 500,
                            msg: 'NOT FOUND'
                        })
                    } else {
                        res.render('assets/first-category/de', {
                            product: secondCategory,
                            title: 'ECSell',
                            prev_category: detail_params,
                            categories: categoryies,
                            hotLabels: hotLabel,
                            user: req.cookies['account'],
                            status: statusCode
                        })
                    }
                } else {
                    if (req.cookies["account"] != null) {
                        statusCode = 200;
                    } else {
                        statusCode = 500;
                    }
                    res.render('assets/404/de', {
                        product: [],
                        title: 'ECSell',
                        prev_category: [],
                        categories: categoryies,
                        hotLabels: hotLabel,
                        user: req.cookies['account'],
                        status: statusCode
                    })
                }
            })
    } else if (req.params["category"] != 'admin') {
        //二级类目
        console.log(req.params["category"] + '------------')
        let uri = '/de/' + req.params["category"] + '/' + req.params["id"]
        console.log(uri)
        db.categorys
            .findOne({'secondCategory.secondUrl': uri})
            .populate('secondCategory.thirdTitles.product')
            .exec((err, data) => {
                let detail_params = {}
                let products = []
                detail_params.firstTitle = data.de_firstCategory
                detail_params.firstUrl = data.de_firstUrl

                async.each((data.secondCategory), (item, callback) => {
                    if (item.de_secondUrl == uri) {
                        detail_params.secondTitle = item.de_secondTitle
                        detail_params.secondUrl = item.de_secondUrl
                        products.push(item)
                        callback()
                    } else {
                        callback()
                    }
                })
                let statusCode = null
                if (req.cookies["account"] != null) {
                    statusCode = 200;
                } else {
                    statusCode = 500
                }
                console.log(detail_params)
                res.render('assets/second-category/de', {
                    product: products,
                    title: 'ECSell',
                    prev_category: detail_params,
                    categories: categoryies,
                    hotLabels: hotLabel,
                    user: req.cookies['account'],
                    status: statusCode
                })
            })

    }
})


module.exports = router