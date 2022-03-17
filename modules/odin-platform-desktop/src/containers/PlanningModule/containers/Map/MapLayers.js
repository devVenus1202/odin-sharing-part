import {Image as ImageLayer, Tile as TileLayer} from 'ol/layer';
import LayerGroup from 'ol/layer/Group';
import ImageWMS from 'ol/source/ImageWMS';
import XYZ from 'ol/source/XYZ';

const REACT_APP_QGIS_SERVER_URL = process.env.REACT_APP_QGIS_SERVER_URL || 'https://api.odin.prod.netomnia.com/cgi-bin/qgis_mapserv.fcgi?map=/home/qgis/projects/project.qgs';

const minZoom = {
    polygon: 5,
    line: 10,
    point: 10
}

const debounce = 300;

export const mapLayers = [

    /* PLAN ***********************/
    new LayerGroup({
        title: 'Plan',
        fold: "close",
        zIndex: 9999,
        layers: [
            new LayerGroup({
                title: 'Point',
                fold: "close",
                layers: [
                    new ImageLayer({
                        zIndex: 9989,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['exchange'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Exchange',
                        visible: true,
                    }),
                    new ImageLayer({
                        zIndex: 9989,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['closure'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Closure',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 9979,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['chamber'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Chamber',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 9969,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['pole'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Pole',
                        visible: false,
                    }),
                ],
            }),
            new LayerGroup({
                title: 'Line',
                fold: "close",
                zIndex: 8888,
                minZoom: minZoom.line,
                layers: [
                    new LayerGroup({
                            title: 'Cable',
                            fold: "close",
                            zIndex: 8878,
                            layers: [

                                /* Plan -> Cable -> Spine */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"type_id" = 1 and "eco" = 'true'`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'Spine',
                                    visible: false,
                                }),

                                /* Plan -> Cable -> Distribution */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"type_id" = 2 AND "eco" = 'true'`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'Distribution',
                                    visible: false,
                                }),

                                /* Plan -> Cable -> Access */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"type_id" = 3 AND "ground_id" IN ( 1 , 2 ) AND "eco" = 'true'`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'Access',
                                    visible: false,
                                }),


                                /* Plan -> Cable -> Feed */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"type_id" = 4 AND "ground_id" IN ( 1 , 2 ) AND "eco" = 'true'`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'Feed',
                                    visible: false,
                                }),


                                /* Plan -> Cable -> On Hold */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"eco" = 'false' OR "eco" IS NULL`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'On Hold',
                                    visible: false,
                                }),

                                /* Plan -> Cable -> Temp */
                                /*                                new ImageLayer({
                                                                    zIndex: 8878,
                                                                    source: new ImageWMS({
                                                                        url: REACT_APP_QGIS_SERVER_URL,
                                                                        params: {
                                                                            'LAYERS': ['cable'],
                                                                            'FILTER': `cable:"type_id" = 6`,
                                                                        },
                                                                        ratio: 1,
                                                                        serverType: 'qgis',
                                                                        imageLoadFunction: function (image, src) {
                                                                            this.timeout && clearTimeout(this.timeout);
                                                                            this.timeout = setTimeout(() => {
                                                                                image.getImage().src = src;
                                                                            }, debounce);
                                                                        }
                                                                    }),
                                                                    title: 'Temp',
                                                                    visible: false,
                                                                }),*/

                                /* Plan -> Cable -> CableLink */
                                new ImageLayer({
                                    zIndex: 8878,
                                    source: new ImageWMS({
                                        url: REACT_APP_QGIS_SERVER_URL,
                                        params: {
                                            'LAYERS': ['cable'],
                                            'FILTER': `cable:"type_id" = 7`,
                                        },
                                        ratio: 1,
                                        serverType: 'qgis',
                                        imageLoadFunction: function (image, src) {
                                            this.timeout && clearTimeout(this.timeout);
                                            this.timeout = setTimeout(() => {
                                                image.getImage().src = src;
                                            }, debounce);
                                        }
                                    }),
                                    title: 'CableLink',
                                    visible: false,
                                }),

                            ]
                        }
                    ),

                    new ImageLayer({
                        zIndex: 8868,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['duct'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Duct',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 8858,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['rope'],
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Rope',
                        visible: false,
                    }),
                ],
            }),
        ],
    }),

    /* BUILD ***********************/
    new LayerGroup({
        title: 'Build',
        fold: "close",
        zIndex: 7777,
        layers: [
            new LayerGroup({
                title: 'Point',
                fold: "close",
                minZoom: minZoom.point,
                layers: [
                    new ImageLayer({
                        zIndex: 7767,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_closure'],
                                'FILTER':`build_closure:"eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Closure',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 7757,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_chamber'],
                                'FILTER':`build_chamber:"eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Chamber',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 7747,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_pole'],
                                'FILTER':`build_pole:"eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Pole',
                        visible: false,
                    }),
                ],
            }),
            new LayerGroup({
                title: 'Line',
                fold: "close",
                zIndex: 6666,
                minZoom: minZoom.line,
                layers: [
                    new ImageLayer({
                        zIndex: 6656,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_cable'],
                                'FILTER':`build_cable:"eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Cable',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 6646,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_duct'],
                                'FILTER':`build_duct:"type_id" = 1 AND "eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Duct',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 6646,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_duct'],
                                'FILTER':`build_duct:"type_id" = 2 AND "eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Subduct',
                        visible: false,
                    }),
                    new ImageLayer({
                        zIndex: 6636,
                        source: new ImageWMS({
                            url: REACT_APP_QGIS_SERVER_URL,
                            params: {
                                'LAYERS': ['build_rope'],
                                'FILTER':`build_rope:"eco" = 'true'`
                            },
                            ratio: 1,
                            serverType: 'qgis',
                            imageLoadFunction: function (image, src) {
                                this.timeout && clearTimeout(this.timeout);
                                this.timeout = setTimeout(() => {
                                    image.getImage().src = src;
                                }, debounce);
                            }
                        }),
                        title: 'Build Rope',
                        visible: false,
                    }),
                ],
            }),
        ],
    }),

    /* POLYGON ***********************/
    new ImageLayer({
        zIndex: 5000,
        source: new ImageWMS({
            url: REACT_APP_QGIS_SERVER_URL,
            params: {
                'LAYERS': ['polygon'],
            },
            ratio: 1,
            serverType: 'qgis',
            imageLoadFunction: function (image, src) {
                this.timeout && clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    image.getImage().src = src;
                }, debounce);
            }
        }),
        title: 'Polygon',
        visible: false,
    }),

    /* SURVEY ***********************/
    new LayerGroup({
        title: 'Survey',
        fold: "close",
        zIndex: 4500,
        layers: [

            /* SURVEY / HAZARD */
            new ImageLayer({
                zIndex: 4400,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': 'hazard',
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Hazard',
                visible: false,
            }),

            /* SURVEY / BLOCKAGE */
            new ImageLayer({
                zIndex: 4300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': 'blockage',
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Blockage',
                visible: false,
            }),


            /* SURVEY / SURVEY STRUCTURE */
            new ImageLayer({
                zIndex: 4200,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': 'survey_structure',
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Survey Structure',
                visible: false,
            }),


            /* SURVEY / SURVEY ROUTE */
            new ImageLayer({
                zIndex: 4100,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': 'survey_route',
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Survey Route',
                visible: false,
            }),

        ]
    }),

    /* ODIN ***********************/
    new ImageLayer({
        zIndex: 3000,
        source: new ImageWMS({
            url: REACT_APP_QGIS_SERVER_URL,
            params: {
                'LAYERS': ['orders'],
            },
            ratio: 1,
            serverType: 'qgis',
            imageLoadFunction: function (image, src) {
                this.timeout && clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    image.getImage().src = src;
                }, debounce);
            }
        }),
        title: 'Odin',
        visible: false,
    }),

    /* OPENREACH ***********************/
    new LayerGroup({
        title: 'Openreach',
        visible: false,
        fold: "close",
        zIndex: 2500,
        layers: [

            new ImageLayer({
                zIndex: 2400,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['pia_structure']
                    },
                    ratio: 1,
                    serverType: 'qgis',
                    imageLoadFunction: function (image, src) {
                        this.timeout && clearTimeout(this.timeout);
                        this.timeout = setTimeout(() => {
                            image.getImage().src = src;
                        }, debounce);
                    }
                }),
                title: 'PIA Structure',
                visible: false,
            }),
            new ImageLayer({
                zIndex: 2300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['pia_duct']
                    },
                    ratio: 1,
                    serverType: 'qgis',
                    imageLoadFunction: function (image, src) {
                        this.timeout && clearTimeout(this.timeout);
                        this.timeout = setTimeout(() => {
                            image.getImage().src = src;
                        }, debounce);
                    }
                }),
                title: 'PIA Duct',
                visible: false,
            }),
        ],
    }),


    /* ADDRESSES ***********************/
    new LayerGroup({
        title: 'Addresses',
        fold: "close",
        zIndex: 1500,
        layers: [
            new ImageLayer({
                zIndex: 1300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['Addresses'],
                        'FILTER': `Addresses:"class_type" = 'Residential' AND "sprn" < 38900137`,
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Residential',
                visible: false,
            }),
            new ImageLayer({
                zIndex: 1300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['Addresses'],
                        'FILTER': `Addresses:"class_type" = 'Business' AND "sprn" < 38900137`,
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Business',
                visible: false,
            }),
            new ImageLayer({
                zIndex: 1300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['Addresses'],
                        'FILTER': `Addresses:NOT "class_type" = 'Residential' AND NOT "class_type" = 'Business'`,
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Other',
                visible: false,
            }),
            new ImageLayer({
                zIndex: 1300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {
                        'LAYERS': ['Addresses'],
                        'FILTER': `Addresses:"sprn" > 38900137`,
                    },
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Newly Added',
                visible: false,
            }),
        ],
    }),


    /* OS ***********************/
    new LayerGroup({
        title: 'OS',
        fold: "close",
        zIndex: 1500,
        layers: [
            new ImageLayer({
                zIndex: 1300,
                source: new ImageWMS({
                    url: REACT_APP_QGIS_SERVER_URL,
                    params: {'LAYERS': ['topographicline']},
                    ratio: 1,
                    serverType: 'qgis',
                }),
                title: 'Topographic Line',
                visible: false,
            }),
        ],
    }),


    /* MAPS ***********************/
    new LayerGroup({
        title: 'Maps',
        zIndex: -100,
        fold: "close",
        layers: [
            new TileLayer({
                source: new XYZ({
                    url: 'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
                }),
                title: 'Google Roads',
                visible: true,
                zIndex: -100,
                className: 'googleMaps'
            }),
            new TileLayer({
                source: new XYZ({
                    url: 'https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
                }),
                title: 'Google Satelite',
                visible: false,
                zIndex: -100,
                className: 'googleMaps'
            }),
            new TileLayer({
                source: new XYZ({
                    url: 'https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
                }),
                title: 'Google Hybrid',
                visible: false,
                zIndex: -100,
                className: 'googleMaps'
            }),
        ],
    }),

];

