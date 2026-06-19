import { Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { Link } from "react-router-dom";

type Props = {
    id: string;
    name: string;
    location: string;
};

// clickable project tile
export default function ProjectCard({ id, name, location }: Props) {
    return (
        <Card>
            <CardActionArea component={Link} to={`/projects/${id}`}>
                <CardContent>
                    <Typography variant="h6">{name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {location}
                    </Typography>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
