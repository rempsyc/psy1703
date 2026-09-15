library(ggplot2)

resultats <- data.frame(
  adjectifs = factor(rep(c("dependance", "independance"), each = 3)),
  groupe = factor(
    rep(c("schema_dependance", "aschematic", "schema_independance"), 2),
    levels = c("schema_dependance", "aschematic", "schema_independance")
  ),
  latence = c(21.8, 21.5, 22.5, 26.3, 21.4, 19.1)
)

graphique <- ggplot(
  resultats,
  aes(x = adjectifs, y = latence, colour = groupe, group = groupe)
) +
  geom_line(linewidth = 2.1) +
  geom_point(size = 5) +
  annotate(
    "text", x = 1, y = 19.2, label = "Plus rapide", colour = "#44606e",
    size = 5.2, fontface = "bold"
  ) +
  annotate(
    "segment", x = 0.72, xend = 0.72, y = 20.2, yend = 19.35,
    arrow = arrow(length = unit(0.18, "cm")), colour = "#44606e", linewidth = 1
  ) +
  scale_colour_manual(
    values = c(
      "schema_dependance" = "#d66a1f",
      "aschematic" = "#7b8790",
      "schema_independance" = "#007c83"
    ),
    labels = c(
      "Sch\u00e9ma de d\u00e9pendance",
      "Asch\u00e9matique",
      "Sch\u00e9ma d\u2019ind\u00e9pendance"
    )
  ) +
  scale_x_discrete(labels = c("D\u00e9pendance", "Ind\u00e9pendance")) +
  scale_y_continuous(breaks = 19:27, limits = c(18.7, 27)) +
  labs(
    x = "Adjectifs jug\u00e9s comme d\u00e9crivant la participante",
    y = "Temps de r\u00e9ponse moyen (secondes)",
    colour = NULL
  ) +
  theme_minimal(base_family = "Arial", base_size = 19) +
  theme(
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_blank(),
    panel.grid.major.y = element_line(colour = "#d8e2e6", linewidth = 0.7),
    axis.title = element_text(colour = "#123b5d", face = "bold"),
    axis.text = element_text(colour = "#243746"),
    legend.position = "top",
    legend.text = element_text(size = 16),
    plot.margin = margin(12, 24, 8, 12)
  )

ggsave(
  filename = "C:/github/psy1703/cours/03/assets/markus1977-latences.svg",
  plot = graphique,
  width = 13,
  height = 5.8,
  units = "in",
  bg = "white",
  device = svglite::svglite
)
