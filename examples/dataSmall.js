
var treeData = {
  "type": "person",
  "name": "Kathryn Mcclure",
  "car": {
    "make": "Ford",
    "model": "Taurus"
  },
  "family": [
    {
      "type": "person",
      "name": "Reyes Cameron"
    },
    {
      "type": "person",
      "name": "Edna Mcgee"
    },
    {
      "type": "person",
      "name": "Cervantes Bird"
    },
    {
      "type": "person",
      "name": "Jeri Bowen"
    }
  ],
  "friends": [
    {
      "type": "person",
      "name": "Battle Riley"
    },
    {
      "type": "person",
      "name": "Delores Townsend"
    },
    {
      "type": "person",
      "name": "Cain Jimenez"
    }
  ],
  "coworkers": [
    {
      "type": "person",
      "name": "Hutchinson Murray"
    },
    {
      "type": "person",
      "name": "Angelica Olsen"
    },
    {
      "type": "person",
      "name": "Lakisha Howard"
    },
    {
      "type": "person",
      "name": "Joann Bean"
    },
    {
      "type": "person",
      "name": "Serena Rowland"
    }
  ],
  "roommates": [
    {
      "type": "person",
      "name": "Blankenship Ware"
    }
  ],
  "pets": [
    {
      "type": "animal",
      "name": "Palmer"
    },
    {
      "type": "animal",
      "name": "Vivian"
    }
  ]
}

var directedGraphData = {
  class: "person",
  name: "Tom",
  family: [],
  friends: [],
  coworkers: [],
  roommates: [],

}

var graphData = {
  "name": "Jacqueline Dillard",
  "friends": [
    {
      "name": "Wise Vega",
      "friends": [
        {
          "name": "Dixon Guy",
          "friends": [
            {
              "name": "Eloise Gutierrez"
            },
            {
              "name": "Mavis Kelley"
            },
            {
              "name": "Benton Nicholson"
            }
          ]
        },
        {
          "name": "Rene Kinney",
          "friends": [
            {
              "name": "Dominique Gordon"
            },
            {
              "name": "Tanya Mcclure"
            },
            {
              "name": "Rodriquez Ratliff"
            },
            {
              "name": "Concetta Welch"
            },
            {
              "name": "Kristy Hays"
            }
          ]
        },
        {
          "name": "Maggie Gay",
          "friends": [
            {
              "name": "Cheryl Carter"
            },
            {
              "name": "Courtney Hansen"
            },
            {
              "name": "Earlene Mcfadden"
            },
            {
              "name": "Beatriz Hodges"
            }
          ]
        }
      ]
    },
    {
      "name": "Paul Schwartz",
      "friends": [
        {
          "name": "Preston Taylor",
          "friends": [
            {
              "name": "Rice Solis"
            },
            {
              "name": "Noelle Prince"
            },
            {
              "name": "Crawford Hale"
            },
            {
              "name": "Finley Beard"
            }
          ]
        },
        {
          "name": "Wyatt Hodge",
          "friends": [
            {
              "name": "Georgia Goodwin"
            },
            {
              "name": "Moses Carey"
            },
            {
              "name": "Nita Calhoun"
            },
            {
              "name": "Louisa Britt"
            },
            {
              "name": "Kline Conley"
            }
          ]
        },
        {
          "name": "Hollie Riddle",
          "friends": [
            {
              "name": "Martin Bird"
            },
            {
              "name": "Melton Pace"
            },
            {
              "name": "Joanne Sullivan"
            }
          ]
        }
      ]
    },
    {
      "name": "Cortez Stephenson",
      "friends": [
        {
          "name": "Perez Fry",
          "friends": [
            {
              "name": "Brittney Langley"
            },
            {
              "name": "Guadalupe Edwards"
            },
            {
              "name": "Miles Jordan"
            },
            {
              "name": "Terry Chavez"
            }
          ]
        },
        {
          "name": "Minerva Adkins",
          "friends": [
            {
              "name": "Lloyd Melendez"
            },
            {
              "name": "Thompson Serrano"
            },
            {
              "name": "Hilary Morin"
            },
            {
              "name": "Whitaker Stout"
            }
          ]
        },
        {
          "name": "Tameka Tanner",
          "friends": [
            {
              "name": "Marsh Noble"
            },
            {
              "name": "Wynn Gates"
            },
            {
              "name": "Cherie Townsend"
            },
            {
              "name": "Gay Coffey"
            },
            {
              "name": "Leta Franco"
            }
          ]
        }
      ]
    },
    {
      "name": "Boone Craig",
      "friends": [
        {
          "name": "Gould Morrow",
          "friends": [
            {
              "name": "Vaughn Sweeney"
            },
            {
              "name": "Lott Horne"
            },
            {
              "name": "Massey Bright"
            },
            {
              "name": "Kaye Olson"
            }
          ]
        },
        {
          "name": "Walter Mosley",
          "friends": [
            {
              "name": "Sosa Walsh"
            },
            {
              "name": "Kim Austin"
            },
            {
              "name": "Mason Harris"
            }
          ]
        },
        {
          "name": "Howard Farmer",
          "friends": [
            {
              "name": "Hester Harper"
            },
            {
              "name": "Dotson Mullins"
            },
            {
              "name": "Baxter Roberts"
            },
            {
              "name": "Janna Donovan"
            }
          ]
        },
        {
          "name": "Craft Goff",
          "friends": [
            {
              "name": "Tracey Goodman"
            },
            {
              "name": "Isabella Strickland"
            },
            {
              "name": "Jeanne Terrell"
            },
            {
              "name": "Jenifer Carver"
            }
          ]
        }
      ]
    },
    {
      "name": "Nolan Dean",
      "friends": [
        {
          "name": "Kathy Christensen",
          "friends": [
            {
              "name": "Josefa Kaufman"
            },
            {
              "name": "Smith Harding"
            },
            {
              "name": "Livingston Robinson"
            },
            {
              "name": "Kristie Daniels"
            },
            {
              "name": "Regina Donaldson"
            }
          ]
        },
        {
          "name": "Rachel Mcfarland",
          "friends": [
            {
              "name": "Chasity Glass"
            },
            {
              "name": "Tyson Wheeler"
            },
            {
              "name": "Lynette Little"
            },
            {
              "name": "Mari Baker"
            },
            {
              "name": "Charlotte Christian"
            }
          ]
        },
        {
          "name": "Melendez Meyers",
          "friends": [
            {
              "name": "Pamela Mclean"
            },
            {
              "name": "Valerie Blevins"
            },
            {
              "name": "Brigitte Raymond"
            }
          ]
        }
      ]
    }
  ]
}